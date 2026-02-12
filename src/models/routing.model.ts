export enum RoutingDecision {
    SENT = "sent",
    SKIPPED_INELIGIBLE = "skipped_ineligible",
    ERROR = "error",
}

export interface LenderRoutingLog {
    id: string;
    leadId: string;
    lenderName: string;
    decision: RoutingDecision;
    reason: string | null;
    leadData: {
        monthlyIncome: number;
        age: number;
        employmentType: string;
        state: string;
    };
    createdAt: Date;
}
