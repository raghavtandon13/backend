import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { LenderApiResponse, LenderClient, LenderConfig, LenderRequest } from "@/models";
import { logger } from "@/utils/logger";

export abstract class BaseLenderClient implements LenderClient {
    protected readonly httpClient: AxiosInstance;

    constructor(
        public readonly name: LenderConfig["name"],
        public readonly config: LenderConfig,
    ) {
        this.httpClient = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout,
            headers: {
                "Content-Type": "application/json",
            },
        });

        // Add request/response interceptors for logging
        this.httpClient.interceptors.request.use(
            (requestConfig) => {
                logger.debug({
                    message: "Lender API Request",
                    lender: this.name,
                    method: requestConfig.method?.toUpperCase(),
                    url: requestConfig.url,
                });
                return requestConfig;
            },
            (error) => Promise.reject(error),
        );

        this.httpClient.interceptors.response.use(
            (response) => {
                logger.debug({
                    message: "Lender API Response",
                    lender: this.name,
                    status: response.status,
                });
                return response;
            },
            (error: AxiosError) => Promise.reject(error),
        );
    }

    abstract sendLead(lead: LenderRequest): Promise<LenderApiResponse>;

    async isHealthy(): Promise<boolean> {
        try {
            // Default health check - can be overridden by subclasses
            await this.httpClient.get("/health", { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    protected handleError(error: unknown): LenderApiResponse {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            logger.error({
                message: "Lender API Error",
                lender: this.name,
                status: axiosError.response?.status,
                data: axiosError.response?.data,
            });

            return {
                success: false,
                status: "Error",
                error: axiosError.message,
                data: axiosError.response?.data as Record<string, unknown>,
            };
        }

        logger.error({
            message: "Unexpected Lender Error",
            lender: this.name,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
            success: false,
            status: "Error",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }

    protected formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    }
}
