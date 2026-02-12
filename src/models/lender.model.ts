export enum LenderName {
    KARROFIN = "KarroFin",
    POCKETCREDIT = "PocketCredit",
    ZYPE = "Zype",
}

export interface LenderConfig {
    id: string;
    name: LenderName;
    baseUrl: string;
    apiKey: string;
    timeout: number;
    enabled: boolean;
    eligibilityRules: EligibilityRules;
    rateLimitPerMinute: number;
}

export interface EligibilityRules {
    minIncome: number;
    maxIncome?: number;
    minAge: number;
    maxAge: number;
    allowedEmploymentTypes: string[];
    allowedStates?: string[];
    excludedStates?: string[];
    minLoanAmount?: number;
    maxLoanAmount?: number;
}

export interface LenderRequest {
    leadId: string;
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    monthlyIncome: number;
    employmentType: string;
    panNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
}

export interface LenderApiResponse {
    success: boolean;
    status: string;
    message?: string;
    data?: Record<string, unknown>;
    error?: string;
}

export interface LenderClient {
    readonly name: LenderName;
    readonly config: LenderConfig;
    sendLead(lead: LenderRequest): Promise<LenderApiResponse>;
    isHealthy(): Promise<boolean>;
}
