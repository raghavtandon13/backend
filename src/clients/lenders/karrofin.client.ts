import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { BaseLenderClient } from "../base-lender.client";

interface KarroFinResponse {
    status: string;
    message?: string;
    lead_id?: string;
    duplicate?: boolean;
}

export class KarroFinClient extends BaseLenderClient {
    async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
        try {
            const payload = {
                personal_info: {
                    phone: lead.phone,
                    email: lead.email,
                    first_name: lead.firstName,
                    last_name: lead.lastName,
                    dob: this.formatDate(lead.dateOfBirth),
                    pan: lead.panNumber,
                },
                employment: {
                    type: lead.employmentType,
                    monthly_income: lead.monthlyIncome,
                },
                address: {
                    line1: lead.address,
                    city: lead.city,
                    state: lead.state,
                    pincode: lead.pincode,
                },
            };

            const response = await this.httpClient.post<KarroFinResponse>("/leads", payload);
            const data = response.data;

            let status: LenderResponseStatus;
            if (data.duplicate) {
                status = "Deduped" as LenderResponseStatus;
            } else if (data.status === "approved") {
                status = "Accepted" as LenderResponseStatus;
            } else if (data.status === "rejected") {
                status = "Rejected" as LenderResponseStatus;
            } else {
                status = "Error" as LenderResponseStatus;
            }

            return {
                success: status !== ("Error" as LenderResponseStatus),
                status,
                message: data.message,
                data: data as unknown as Record<string, unknown>,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }
}
