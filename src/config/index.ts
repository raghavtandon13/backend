import dotenv from "dotenv";
import { type LenderConfig, LenderName } from "@/models";

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    databaseUrl: process.env.DATABASE_URL || "",

    lenders: {
        [LenderName.KARROFIN]: {
            id: "karrofin-001",
            name: LenderName.KARROFIN,
            baseUrl: process.env.KARROFIN_BASE_URL || "",
            apiKey: process.env.KARROFIN_API_KEY || "",
            partnerCode: process.env.KARROFIN_PARTNER_CODE || "",
            passkey: process.env.KARROFIN_PASSKEY || "",
            timeout: 30000,
            enabled: Boolean(process.env.KARROFIN_PARTNER_CODE && process.env.KARROFIN_PASSKEY),
            eligibilityRules: {
                minIncome: 20000,
                minAge: 21,
                maxAge: 58,
                allowedEmploymentTypes: ["salaried", "self_employed"],
            },
            rateLimitPerMinute: 60,
        } as LenderConfig,

        [LenderName.POCKETCREDIT]: {
            id: "pocketcredit-001",
            name: LenderName.POCKETCREDIT,
            baseUrl: process.env.POCKETCREDIT_BASE_URL || "",
            apiKey: process.env.POCKETCREDIT_API_KEY || "",
            clientId: process.env.POCKETCREDIT_CLIENT_ID || "",
            clientSecret: process.env.POCKETCREDIT_CLIENT_SECRET || "",
            timeout: 30000,
            enabled: Boolean(process.env.POCKETCREDIT_CLIENT_ID && process.env.POCKETCREDIT_CLIENT_SECRET),
            eligibilityRules: {
                minIncome: 15000,
                maxIncome: 100000,
                minAge: 21,
                maxAge: 60,
                allowedEmploymentTypes: ["salaried", "self_employed", "business"],
            },
            rateLimitPerMinute: 100,
        } as LenderConfig,

        [LenderName.ZYPE]: {
            id: "zype-001",
            name: LenderName.ZYPE,
            baseUrl: process.env.ZYPE_BASE_URL || "",
            apiKey: process.env.ZYPE_API_KEY || "",
            timeout: 30000,
            enabled: Boolean(process.env.ZYPE_API_KEY),
            eligibilityRules: {
                minIncome: 25000,
                minAge: 23,
                maxAge: 55,
                allowedEmploymentTypes: ["salaried"],
                allowedStates: ["MH", "DL", "KA", "TN", "TG"],
            },
            rateLimitPerMinute: 50,
        } as LenderConfig,
    },

    retry: {
        dedupCooldownDays: 30,
        maxRetries: 3,
        retryDelayMs: 5000,
    },

    rateLimit: {
        windowMs: 60000,
        maxRequests: 100,
    },
};

export function validateConfig(): void {
    const required = ["DATABASE_URL"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
}
