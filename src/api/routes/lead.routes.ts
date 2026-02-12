import { type NextFunction, type Request, type Response, Router } from "express";
import type { CreateLeadDto } from "@/models";
import type { LeadProcessingService } from "@/services";
import { logRequest } from "@/utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const asyncHandler = (fn: AsyncRequestHandler) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export function createLeadRoutes(leadService: LeadProcessingService): Router {
    const router = Router();

    // POST /api/v1/leads - Create a new lead
    router.post(
        "/",
        asyncHandler(async (req: Request, res: Response) => {
            const startTime = Date.now();

            const leadData = req.body as CreateLeadDto;
            const lead = await leadService.processIncomingLead(leadData);

            const duration = Date.now() - startTime;
            logRequest(req.method, req.path, 201, duration);

            res.status(201).json({
                success: true,
                data: {
                    id: lead.id,
                    phone: lead.phone,
                    email: lead.email,
                    status: lead.status,
                    sources: lead.sources.map((s) => s.sourceName),
                    createdAt: lead.createdAt,
                },
            });
        }),
    );

    // GET /api/v1/leads/:id - Get lead by ID
    router.get("/:id", (_req: Request, res: Response) => {
        const startTime = Date.now();

        // TODO: Implement get lead by ID

        const duration = Date.now() - startTime;
        logRequest("GET", "/:id", 200, duration);

        res.status(200).json({
            success: true,
            data: null,
        });
    });

    return router;
}
