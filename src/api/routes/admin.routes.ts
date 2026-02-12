import { type NextFunction, type Request, type Response, Router } from "express";
import type { RetryService } from "@/services";
import { logger } from "@/utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const asyncHandler = (fn: AsyncRequestHandler) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export function createRetryRoutes(retryService: RetryService): Router {
    const router = Router();

    // POST /api/v1/admin/retry-deduped - Manually trigger retry of deduped leads
    router.post(
        "/retry-deduped",
        asyncHandler(async (_req: Request, res: Response) => {
            const count = await retryService.retryDedupedLeads();

            logger.info({ message: "Manual retry triggered", count });

            res.status(200).json({
                success: true,
                data: {
                    retriedCount: count,
                },
            });
        }),
    );

    return router;
}
