import "reflect-metadata";
import express, { type Application } from "express";
import { errorHandler, notFoundHandler, securityMiddleware } from "./api/middleware/error.middleware";
import { createRoutes } from "./api/routes";
import { config, validateConfig } from "./config";
import { RetryJob } from "./jobs";
import { initializeDatabase, LeadRepository, LenderResponseRepository, LenderRoutingLogRepository } from "./repositories";
import { LeadProcessingService, RetryService } from "./services";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
    try {
        // Validate configuration
        validateConfig();
        logger.info("Configuration validated");

        // Initialize database
        await initializeDatabase();
        logger.info("Database initialized");

        // Initialize repositories
        const leadRepository = new LeadRepository();
        const lenderResponseRepository = new LenderResponseRepository();
        const routingLogRepository = new LenderRoutingLogRepository();

        // Initialize services
        const leadProcessingService = new LeadProcessingService(leadRepository, lenderResponseRepository, routingLogRepository);
        const retryService = new RetryService(leadRepository, lenderResponseRepository);

        // Initialize Express app
        const app: Application = express();

        // Middleware
        app.use(securityMiddleware);
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Routes
        app.use(createRoutes(leadProcessingService, retryService));

        // 404 handler
        app.use(notFoundHandler);

        // Error handler
        app.use(errorHandler);

        // Start background job
        const retryJob = new RetryJob(retryService, 60); // Run every hour
        void retryJob.start();

        // Start server
        const server = app.listen(config.port, () => {
            logger.info({
                message: "Server started",
                port: config.port,
                environment: config.nodeEnv,
            });
        });

        // Graceful shutdown
        process.on("SIGTERM", () => {
            logger.info("SIGTERM received, shutting down gracefully");
            retryJob.stop();
            server.close(() => {
                logger.info("Server closed");
                process.exit(0);
            });
        });

        process.on("SIGINT", () => {
            logger.info("SIGINT received, shutting down gracefully");
            retryJob.stop();
            server.close(() => {
                logger.info("Server closed");
                process.exit(0);
            });
        });
    } catch (error) {
        logger.error({
            message: "Failed to start application",
            error: error instanceof Error ? error.message : "Unknown error",
        });
        process.exit(1);
    }
}

void bootstrap();
