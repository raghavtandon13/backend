import { LenderClientFactory } from "@/clients";
import { config } from "@/config";
import type { Lead, LenderClient, LenderName, LenderRequest, LenderResponseStatus } from "@/models";
import type { LeadRepository, LenderResponseRepository } from "@/repositories";
import { logger } from "@/utils/logger";

export class RetryService {
    constructor(
        private readonly leadRepository: LeadRepository,
        private readonly responseRepository: LenderResponseRepository,
    ) {}

    async retryDedupedLeads(): Promise<number> {
        const responses = await this.responseRepository.findDedupedResponsesReadyForRetry();

        if (responses.length === 0) {
            logger.info("No deduped leads ready for retry");
            return 0;
        }

        logger.info({ message: "Retrying deduped leads", count: responses.length });

        let retryCount = 0;

        for (const response of responses) {
            const lead = await this.leadRepository.findById(response.leadId);
            if (!lead) continue;

            const lender = LenderClientFactory.getClient(response.lenderName as LenderName);
            if (!lender) continue;

            try {
                await this.retryLeadWithLender(lead, lender);
                retryCount++;
            } catch (error) {
                logger.error({
                    message: "Failed to retry lead",
                    leadId: lead.id,
                    lender: lender.name,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        return retryCount;
    }

    private async retryLeadWithLender(lead: Lead, lender: LenderClient): Promise<void> {
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

        logger.info({
            message: "Retried lead with lender",
            leadId: lead.id,
            lender: lender.name,
            status: response.status,
        });
    }
}
