import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { logger } from "@/utils/logger";
import { BaseLenderClient } from "../base-lender.client";

interface KarroFinAuthResponse {
    detail?: string;
    result?: string;
}

interface KarroFinLeadResponse {
    status: string;
    message?: string;
    lead_id?: string;
    duplicate?: boolean;
}

export class KarroFinClient extends BaseLenderClient {
    private authToken: string | null = null;
    private tokenExpiry: Date | null = null;

    async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
        try {
            // Ensure we have a valid token
            await this.ensureAuthenticated();

            const payload = {
                name: `${lead.firstName} ${lead.lastName}`,
                mobile: lead.phone,
                email: lead.email,
                date_of_birth: this.formatDate(lead.dateOfBirth),
                gender: "Male", // Default since we don't have this field
                education: "Graduate", // Default since we don't have this field
                pin_code: lead.pincode,
                city: lead.city,
                state: lead.state,
                employment_type: "Salaried",
                monthly_salary: lead.monthlyIncome,
                salary_type: "Direct Account Transfer",
                office_pincode: lead.pincode,
                employer_city: lead.city,
                employer_state: lead.state,
                loan_amount: "150000",
                tenure: "12",
            };

            const response = await this.httpClient.post<KarroFinLeadResponse>("/api/leads/create_leads/", payload, {
                headers: {
                    Authorization: `Bearer ${this.authToken}`,
                },
            });
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

    private async ensureAuthenticated(): Promise<void> {
        // Check if token exists and is not expired (with 5 min buffer)
        if (this.authToken && this.tokenExpiry && new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)) {
            return;
        }

        // Authenticate
        await this.authenticate();
    }

    private async authenticate(): Promise<void> {
        try {
            const partnerCode = this.config.partnerCode;
            const passkey = this.config.passkey;

            if (!partnerCode || !passkey) {
                throw new Error("KarroFin partnerCode and passkey are required");
            }

            logger.info({
                message: "Authenticating with KarroFin",
                lender: this.name,
            });

            const response = await this.httpClient.post<KarroFinAuthResponse>("/api/leads/authentication/", {
                partner_code: partnerCode,
                passkey: passkey,
            });

            const data = response.data;

            if (!data.result) {
                throw new Error(`KarroFin authentication failed: ${data.detail || "No token received"}`);
            }

            this.authToken = data.result;

            // Set expiry (default to 1 hour if not provided) - decode JWT to get exp
            let expiresInSeconds = 3600;
            try {
                interface JwtPayload {
                    exp?: number;
                }
                const payload = JSON.parse(Buffer.from(data.result.split(".")[1], "base64").toString()) as JwtPayload;
                if (payload.exp) {
                    expiresInSeconds = payload.exp - Math.floor(Date.now() / 1000);
                }
            } catch {
                // Use default if JWT parsing fails
            }
            this.tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);

            logger.info({
                message: "Successfully authenticated with KarroFin",
                lender: this.name,
                expiresIn: expiresInSeconds,
            });
        } catch (error) {
            logger.error({
                message: "Failed to authenticate with KarroFin",
                lender: this.name,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            await this.ensureAuthenticated();
            return true;
        } catch {
            return false;
        }
    }
}
