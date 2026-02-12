import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { BaseLenderClient } from "../base-lender.client";

type PocketCreditStatus = "ACCEPTED" | "REJECTED" | "DEDUPED";

interface PocketCreditResponse {
    application_id?: string;
    status: PocketCreditStatus;
    reason?: string;
    dedup_days_remaining?: number;
}

export class PocketCreditClient extends BaseLenderClient {
    async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
        try {
            const payload = {
                mobile: lead.phone,
                email: lead.email,
                name: `${lead.firstName} ${lead.lastName}`,
                dob: this.formatDate(lead.dateOfBirth),
                monthly_salary: lead.monthlyIncome,
                employment_type: this.mapEmploymentType(lead.employmentType),
                pan: lead.panNumber,
                address: lead.address,
                city: lead.city,
                state: lead.state,
                pincode: lead.pincode,
            };

            const response = await this.httpClient.post<PocketCreditResponse>("/api/v1/leads", payload);
            const data = response.data;

            let status: LenderResponseStatus;
            switch (data.status) {
                case "ACCEPTED":
                    status = "Accepted" as LenderResponseStatus;
                    break;
                case "REJECTED":
                    status = "Rejected" as LenderResponseStatus;
                    break;
                case "DEDUPED":
                    status = "Deduped" as LenderResponseStatus;
                    break;
                default:
                    status = "Error" as LenderResponseStatus;
            }

            return {
                success: status !== ("Error" as LenderResponseStatus),
                status,
                message: data.reason,
                data: {
                    ...data,
                    dedup_days_remaining: data.dedup_days_remaining,
                } as unknown as Record<string, unknown>,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    private mapEmploymentType(type: string): string {
        const mapping: Record<string, string> = {
            salaried: "SALARIED",
            self_employed: "SELF_EMPLOYED",
            business: "BUSINESS",
        };
        return mapping[type] || type.toUpperCase();
    }
}
