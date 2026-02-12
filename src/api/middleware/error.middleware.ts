import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppError } from "@/utils/errors";
import { logger } from "@/utils/logger";

export const securityMiddleware = helmet();

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction): void {
    logger.error({
        message: error.message,
        stack: error.stack,
        name: error.name,
    });

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
        return;
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        },
    });
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({
        success: false,
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
}
