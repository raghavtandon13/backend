import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { logger } from "@/utils/logger";
import { BaseLenderClient } from "../base-lender.client";

interface PocketCreditAuthResponse {
    status: boolean;
    code: number;
    message: string;
    data?: {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
    };
}

interface PocketCreditLeadResponse {
    status: boolean;
    code: number;
    message: string;
    utm_link?: string;
    redirect_url?: string;
}

export class PocketCreditClient extends BaseLenderClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiry: Date | null = null;

    async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
        try {
            // Ensure we have a valid token
            await this.ensureAuthenticated();

            const payload = {
                first_name: lead.firstName,
                last_name: lead.lastName,
                mobile_number: lead.phone,
                pan_number: lead.panNumber,
                date_of_birth: this.formatDate(lead.dateOfBirth),
                employment_type: this.mapEmploymentType(lead.employmentType),
                monthly_salary: lead.monthlyIncome,
                payment_mode: "Bank Transfer",
            };

            const response = await this.httpClient.post<PocketCreditLeadResponse>("/lead-dedupe-check", payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            const data = response.data;

            let status: LenderResponseStatus;
            if (data.code === 2005) {
                // Fresh lead - accepted
                status = "Accepted" as LenderResponseStatus;
            } else if (data.code === 2006) {
                // Active user - rejected
                status = "Rejected" as LenderResponseStatus;
            } else if (data.code === 2004) {
                // Registered user - treat as deduped
                status = "Deduped" as LenderResponseStatus;
            } else {
                status = "Error" as LenderResponseStatus;
            }

            return {
                success: data.status && status !== ("Error" as LenderResponseStatus),
                status,
                message: data.message,
                data: {
                    code: data.code,
                    utm_link: data.utm_link,
                    redirect_url: data.redirect_url,
                } as Record<string, unknown>,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    private async ensureAuthenticated(): Promise<void> {
        // Check if token exists and is not expired (with 5 min buffer)
        if (this.accessToken && this.tokenExpiry && new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)) {
            return;
        }

        // Try to refresh if we have a refresh token
        if (this.refreshToken) {
            try {
                await this.refreshAccessToken();
                return;
            } catch {
                // Refresh failed, try full authentication
                logger.warn({
                    message: "Token refresh failed, attempting full re-authentication",
                    lender: this.name,
                });
            }
        }

        // Full authentication
        await this.authenticate();
    }

    private async authenticate(): Promise<void> {
        try {
            const clientId = this.config.clientId;
            const clientSecret = this.config.clientSecret;

            if (!clientId || !clientSecret) {
                throw new Error("PocketCredit clientId and clientSecret are required");
            }

            logger.info({
                message: "Authenticating with PocketCredit",
                lender: this.name,
            });

            const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

            const response = await this.httpClient.post<PocketCreditAuthResponse>(
                "/login",
                {},
                {
                    headers: {
                        Authorization: `Basic ${basicAuth}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = response.data;

            if (!data.status || !data.data?.access_token) {
                throw new Error(`PocketCredit authentication failed: ${data.message || "No token received"}`);
            }

            this.accessToken = data.data.access_token;
            this.refreshToken = data.data.refresh_token;

            // Set expiry (default to 15 min if not provided)
            const expiresInSeconds = data.data.expires_in || 900;
            this.tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);

            logger.info({
                message: "Successfully authenticated with PocketCredit",
                lender: this.name,
                expiresIn: expiresInSeconds,
            });
        } catch (error) {
            logger.error({
                message: "Failed to authenticate with PocketCredit",
                lender: this.name,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }

    private async refreshAccessToken(): Promise<void> {
        if (!this.refreshToken) {
            throw new Error("No refresh token available");
        }

        try {
            const clientId = this.config.clientId;
            const clientSecret = this.config.clientSecret;
            const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

            const response = await this.httpClient.post<PocketCreditAuthResponse>(
                "/refresh-token",
                {
                    refresh_token: this.refreshToken,
                },
                {
                    headers: {
                        Authorization: `Basic ${basicAuth}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = response.data;

            if (!data.status || !data.data?.access_token) {
                throw new Error(`Token refresh failed: ${data.message || "No token received"}`);
            }

            this.accessToken = data.data.access_token;
            this.refreshToken = data.data.refresh_token;

            const expiresInSeconds = data.data.expires_in || 900;
            this.tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);

            logger.info({
                message: "Successfully refreshed PocketCredit token",
                lender: this.name,
            });
        } catch (error) {
            logger.error({
                message: "Failed to refresh PocketCredit token",
                lender: this.name,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }

    private mapEmploymentType(type: string): string {
        const mapping: Record<string, string> = {
            salaried: "Salaried",
            self_employed: "Self Employed",
            business: "Business",
        };
        return mapping[type] || type;
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
