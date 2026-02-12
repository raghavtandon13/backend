import { z } from "zod";
import { LenderClientFactory } from "@/clients";
import { config } from "@/config";
import type { CreateLeadDto, Lead, LenderClient, LenderRequest, LenderResponseStatus } from "@/models";
import { EmploymentType, LeadStatus, MIN_INCOME_THRESHOLD, RoutingDecision } from "@/models";
import type { LeadRepository, LenderResponseRepository, LenderRoutingLogRepository } from "@/repositories";
import { ValidationError } from "@/utils/errors";
import { logger, logLenderRequest } from "@/utils/logger";

const createLeadSchema = z.object({
    phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
    email: z.string().email("Invalid email format"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    monthlyIncome: z.number().min(MIN_INCOME_THRESHOLD, `Income must be at least ${MIN_INCOME_THRESHOLD}`),
    employmentType: z.nativeEnum(EmploymentType),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
    source: z.string().min(1, "Source is required"),
});

export class LeadProcessingService {
    constructor(
        private readonly leadRepository: LeadRepository,
        private readonly responseRepository: LenderResponseRepository,
        private readonly routingLogRepository: LenderRoutingLogRepository,
    ) {}

    async processIncomingLead(leadData: CreateLeadDto): Promise<Lead> {
        // Validate input
        const validation = createLeadSchema.safeParse(leadData);
        if (!validation.success) {
            const errors = validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
            throw new ValidationError(`Validation failed: ${errors}`);
        }

        // Check for existing lead by phone or email
        const existingLead = await this.leadRepository.findByPhoneOrEmail(leadData.phone, leadData.email);

        if (existingLead) {
            // Add new source to existing lead
            await this.leadRepository.addSource(
                existingLead.id,
                leadData.source,
                leadData as unknown as Record<string, unknown>,
            );

            logger.info({
                message: "Added new source to existing lead",
                leadId: existingLead.id,
                newSource: leadData.source,
            });

            // Try sending to lenders again
            await this.distributeLeadToLenders(existingLead);

            return existingLead;
        }

        // Create new lead
        const lead = await this.leadRepository.create(leadData);
        logger.info({ message: "Created new lead", leadId: lead.id });

        // Distribute to eligible lenders
        await this.distributeLeadToLenders(lead);

        return lead;
    }

    private async distributeLeadToLenders(lead: Lead): Promise<void> {
        await this.leadRepository.updateStatus(lead.id, LeadStatus.PROCESSING);

        const allEnabledLenders = LenderClientFactory.getAllEnabledClients();
        logger.info({
            message: "Active lenders",
            leadId: lead.id,
            enabledLenders: allEnabledLenders.map((l) => l.name),
            totalEnabled: allEnabledLenders.length,
        });

        if (allEnabledLenders.length === 0) {
            logger.warn({
                message: "No lenders configured - check environment variables",
                leadId: lead.id,
            });
            await this.leadRepository.updateStatus(lead.id, LeadStatus.COMPLETED);
            return;
        }

        const eligibleLenders = this.getEligibleLenders(lead);

        if (eligibleLenders.length === 0) {
            logger.info({ message: "No eligible lenders for lead", leadId: lead.id });
            await this.leadRepository.updateStatus(lead.id, LeadStatus.COMPLETED);
            return;
        }

        logger.info({
            message: "Distributing lead to lenders",
            leadId: lead.id,
            lenderCount: eligibleLenders.length,
            lenderNames: eligibleLenders.map((l) => l.name),
        });

        // Send to all eligible lenders in parallel
        const promises = eligibleLenders.map((lender) => this.sendToLender(lead, lender));
        await Promise.all(promises);

        await this.leadRepository.updateStatus(lead.id, LeadStatus.COMPLETED);
    }

    private getEligibleLenders(lead: Lead): LenderClient[] {
        const age = this.calculateAge(lead.dateOfBirth);
        const skippedLenders: Array<{ name: string; reason: string }> = [];

        const eligible = LenderClientFactory.getAllEnabledClients().filter((client) => {
            const rules = client.config.eligibilityRules;
            const lenderName = client.name;

            // Check income
            if (lead.monthlyIncome < rules.minIncome) {
                skippedLenders.push({
                    name: lenderName,
                    reason: `Income ${lead.monthlyIncome} < min ${rules.minIncome}`,
                });
                return false;
            }
            if (rules.maxIncome && lead.monthlyIncome > rules.maxIncome) {
                skippedLenders.push({
                    name: lenderName,
                    reason: `Income ${lead.monthlyIncome} > max ${rules.maxIncome}`,
                });
                return false;
            }

            // Check age
            if (age < rules.minAge || age > rules.maxAge) {
                skippedLenders.push({
                    name: lenderName,
                    reason: `Age ${age} not in range ${rules.minAge}-${rules.maxAge}`,
                });
                return false;
            }

            // Check employment type
            if (!rules.allowedEmploymentTypes.includes(lead.employmentType)) {
                skippedLenders.push({
                    name: lenderName,
                    reason: `Employment type "${lead.employmentType}" not in [${rules.allowedEmploymentTypes.join(", ")}]`,
                });
                return false;
            }

            // Check state restrictions
            if (rules.allowedStates && !rules.allowedStates.includes(lead.state)) {
                skippedLenders.push({
                    name: lenderName,
                    reason: `State "${lead.state}" not in allowed states [${rules.allowedStates.join(", ")}]`,
                });
                return false;
            }
            if (rules.excludedStates?.includes(lead.state)) {
                skippedLenders.push({
                    name: lenderName,
                    reason: `State "${lead.state}" is excluded`,
                });
                return false;
            }

            return true;
        });

        // Log and save skipped lenders
        if (skippedLenders.length > 0) {
            logger.info({
                message: "Lenders skipped due to eligibility",
                skippedLenders,
            });

            // Save to database for audit trail
            void Promise.all(
                skippedLenders.map((skipped) =>
                    this.routingLogRepository.create({
                        leadId: lead.id,
                        lenderName: skipped.name,
                        decision: RoutingDecision.SKIPPED_INELIGIBLE,
                        reason: skipped.reason,
                        leadData: {
                            monthlyIncome: lead.monthlyIncome,
                            age,
                            employmentType: lead.employmentType,
                            state: lead.state,
                        },
                    }),
                ),
            );
        }

        return eligible;
    }

    private async sendToLender(lead: Lead, lender: LenderClient): Promise<void> {
        const lenderRequest: LenderRequest = {
            leadId: lead.id,
            phone: lead.phone,
            email: lead.email,
            firstName: lead.firstName,
            lastName: lead.lastName,
            dateOfBirth: lead.dateOfBirth.toISOString(),
            monthlyIncome: lead.monthlyIncome,
            employmentType: lead.employmentType,
            panNumber: lead.panNumber,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            pincode: lead.pincode,
        };

        const sentAt = new Date();

        logger.info({
            message: "Sending lead to lender API",
            leadId: lead.id,
            lender: lender.name,
            lenderUrl: lender.config.baseUrl,
        });

        try {
            const response = await lender.sendLead(lenderRequest);
            const respondedAt = new Date();

            let retryAfter: Date | undefined;
            if (response.status === "Deduped") {
                retryAfter = new Date();
                retryAfter.setDate(retryAfter.getDate() + config.retry.dedupCooldownDays);
            }

            await this.responseRepository.create({
                leadId: lead.id,
                lenderId: lender.config.id,
                lenderName: lender.name,
                status: response.status as LenderResponseStatus,
                responseData: response.data || {},
                sentAt,
                respondedAt,
                retryAfter,
            });

            // Log successful send to routing log
            void this.routingLogRepository.create({
                leadId: lead.id,
                lenderName: lender.name,
                decision: RoutingDecision.SENT,
                reason: `API call successful - ${response.status}`,
                leadData: {
                    monthlyIncome: lead.monthlyIncome,
                    age: this.calculateAge(lead.dateOfBirth),
                    employmentType: lead.employmentType,
                    state: lead.state,
                },
            });

            logLenderRequest(lender.name, lead.id, response.success, response.error);
        } catch (error) {
            logger.error({
                message: "Failed to send lead to lender",
                lender: lender.name,
                leadId: lead.id,
                error: error instanceof Error ? error.message : "Unknown error",
            });

            await this.responseRepository.create({
                leadId: lead.id,
                lenderId: lender.config.id,
                lenderName: lender.name,
                status: "Error" as LenderResponseStatus,
                responseData: { error: error instanceof Error ? error.message : "Unknown error" },
                sentAt,
                respondedAt: new Date(),
            });

            // Log error to routing log
            void this.routingLogRepository.create({
                leadId: lead.id,
                lenderName: lender.name,
                decision: RoutingDecision.ERROR,
                reason: error instanceof Error ? error.message : "Unknown error",
                leadData: {
                    monthlyIncome: lead.monthlyIncome,
                    age: this.calculateAge(lead.dateOfBirth),
                    employmentType: lead.employmentType,
                    state: lead.state,
                },
            });
        }
    }

    private calculateAge(dateOfBirth: Date): number {
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--;
        }

        return age;
    }
}
