import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "@/config";
import { LeadEntity } from "./entities/lead.entity";
import { LeadSourceEntity } from "./entities/lead-source.entity";
import { LenderResponseEntity } from "./entities/lender-response.entity";
import { LenderRoutingLogEntity } from "./entities/lender-routing-log.entity";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: config.databaseUrl,
    entities: [LeadEntity, LeadSourceEntity, LenderResponseEntity, LenderRoutingLogEntity],
    synchronize: config.nodeEnv === "development",
    logging: config.nodeEnv === "development",
    ssl: config.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
});

export async function initializeDatabase(): Promise<void> {
    try {
        await AppDataSource.initialize();
        console.log("Database connection established");
    } catch (error) {
        console.error("Error connecting to database:", error);
        throw error;
    }
}
