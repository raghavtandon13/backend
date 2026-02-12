export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500,
        public readonly isOperational: boolean = true,
    ) {
        super(message);
        this.name = "AppError";
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, "VALIDATION_ERROR", 400, true);
        this.name = "ValidationError";
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        super(`${resource}${id ? ` with id ${id}` : ""} not found`, "NOT_FOUND", 404, true);
        this.name = "NotFoundError";
    }
}

export class LenderError extends AppError {
    constructor(
        message: string,
        public readonly lenderName: string,
        public readonly originalError?: Error,
    ) {
        super(message, "LENDER_ERROR", 502, true);
        this.name = "LenderError";
    }
}

export class DuplicateLeadError extends AppError {
    constructor(phone: string, email: string) {
        super(`Lead with phone ${phone} or email ${email} already exists`, "DUPLICATE_LEAD", 409, true);
        this.name = "DuplicateLeadError";
    }
}
