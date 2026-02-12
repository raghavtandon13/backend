import winston from "winston";
import { config } from "@/config";

const { combine, timestamp, json, printf, colorize } = winston.format;

const isDevelopment = config.nodeEnv === "development";

const developmentFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${String(timestamp)} [${level}]: ${String(message)}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

export const logger = winston.createLogger({
    level: isDevelopment ? "debug" : "info",
    defaultMeta: { service: "loan-lead-management" },
    transports: [
        new winston.transports.Console({
            format: isDevelopment ? combine(colorize(), timestamp(), developmentFormat) : combine(timestamp(), json()),
        }),
    ],
});

export function logRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    logger.info({
        message: "HTTP Request",
        method,
        path,
        statusCode,
        durationMs,
    });
}

export function logLenderRequest(lenderName: string, leadId: string, success: boolean, error?: string): void {
    logger.info({
        message: "Lender API Request",
        lenderName,
        leadId,
        success,
        error,
    });
}

export function logError(error: Error, context?: Record<string, unknown>): void {
    logger.error({
        message: error.message,
        stack: error.stack,
        ...context,
    });
}
