import { Router } from "express";
import type { LeadProcessingService, RetryService } from "@/services";
import { createRetryRoutes } from "./admin.routes";
import { createLeadRoutes } from "./lead.routes";

export function createRoutes(leadService: LeadProcessingService, retryService: RetryService): Router {
    const router = Router();

    // Health check
    router.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // API v1 routes
    router.use("/api/v1/leads", createLeadRoutes(leadService));
    router.use("/api/v1/admin", createRetryRoutes(retryService));

    return router;
}
