import type { RetryService } from "@/services";
import { logger } from "@/utils/logger";

export class RetryJob {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly intervalMs: number;

    constructor(
        private readonly retryService: RetryService,
        intervalMinutes: number = 60, // Run every hour by default
    ) {
        this.intervalMs = intervalMinutes * 60 * 1000;
    }

    start(): void {
        if (this.intervalId) {
            logger.warn("Retry job is already running");
            return;
        }

        logger.info({ message: "Starting retry job", intervalMinutes: this.intervalMs / 60000 });

        // Run immediately on start
        void this.runRetry();

        // Schedule recurring runs
        this.intervalId = setInterval(() => {
            void this.runRetry();
        }, this.intervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info("Retry job stopped");
        }
    }

    private async runRetry(): Promise<void> {
        try {
            logger.info("Running retry job for deduped leads");
            const count = await this.retryService.retryDedupedLeads();
            logger.info({ message: "Retry job completed", retriedCount: count });
        } catch (error) {
            logger.error({
                message: "Retry job failed",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
