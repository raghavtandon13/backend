import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { BaseLenderClient } from "../base-lender.client";

interface ZypeResponse {
    success: boolean;
    data?: {
        application_id: string;
        status: string;
    };
    error?: {
        code: string;
        message: string;
        is_duplicate?: boolean;
        retry_after?: string;
    };
}

export class ZypeClient extends BaseLenderClient {
    async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
        try {
            const payload = {
                phone_number: lead.phone,
                email_id: lead.email,
                first_name: lead.firstName,
                last_name: lead.lastName,
                date_of_birth: this.formatDate(lead.dateOfBirth),
                monthly_income: lead.monthlyIncome,
                employment_type: lead.employmentType,
                pan_card: lead.panNumber,
                residential_address: {
                    address_line: lead.address,
                    city: lead.city,
                    state: lead.state,
                    pincode: lead.pincode,
                },
            };

            const response = await this.httpClient.post<ZypeResponse>("/applications", payload);
            const data = response.data;

            if (!data.success) {
                const isDuplicate = data.error?.is_duplicate ?? false;
                const status: LenderResponseStatus = isDuplicate
                    ? ("Deduped" as LenderResponseStatus)
                    : ("Rejected" as LenderResponseStatus);

                return {
                    success: false,
                    status,
                    message: data.error?.message,
                    data: {
                        error_code: data.error?.code,
                        retry_after: data.error?.retry_after,
                    } as Record<string, unknown>,
                };
            }

            const status: LenderResponseStatus =
                data.data?.status === "approved"
                    ? ("Accepted" as LenderResponseStatus)
                    : ("Rejected" as LenderResponseStatus);

            return {
                success: true,
                status,
                data: data.data as unknown as Record<string, unknown>,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }
}
