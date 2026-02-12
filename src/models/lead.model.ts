export enum LeadStatus {
    NEW = "new",
    PROCESSING = "processing",
    COMPLETED = "completed",
    ERROR = "error",
}

export enum LenderResponseStatus {
    ACCEPTED = "Accepted",
    REJECTED = "Rejected",
    DEDUPED = "Deduped",
    ERROR = "Error",
}

export interface Lead {
    id: string;
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    monthlyIncome: number;
    employmentType: EmploymentType;
    panNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    status: LeadStatus;
    createdAt: Date;
    updatedAt: Date;
    sources: LeadSource[];
    lenderResponses: LenderResponse[];
}

export interface LeadSource {
    id: string;
    leadId: string;
    sourceName: string;
    receivedAt: Date;
    rawData: Record<string, unknown>;
}

export interface LenderResponse {
    id: string;
    leadId: string;
    lenderId: string;
    lenderName: string;
    status: LenderResponseStatus;
    responseData: Record<string, unknown>;
    sentAt: Date;
    respondedAt: Date | null;
    retryAfter?: Date;
}

export enum EmploymentType {
    SALARIED = "salaried",
    SELF_EMPLOYED = "self_employed",
    BUSINESS = "business",
    STUDENT = "student",
    UNEMPLOYED = "unemployed",
}

export interface CreateLeadDto {
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    monthlyIncome: number;
    employmentType: EmploymentType;
    panNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    source: string;
}

export interface LeadQueryFilters {
    status?: LeadStatus;
    source?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

export const MIN_INCOME_THRESHOLD = 15000;
export const MIN_AGE = 21;
export const MAX_AGE = 60;
