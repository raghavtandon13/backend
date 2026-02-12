import { Repository } from "typeorm";
import { AppDataSource } from "./data-source";
import { LenderRoutingLogEntity } from "./entities/lender-routing-log.entity";
import { RoutingDecision, type LenderRoutingLog } from "@/models";

export class LenderRoutingLogRepository {
    private readonly repository: Repository<LenderRoutingLogEntity>;

    constructor() {
        this.repository = AppDataSource.getRepository(LenderRoutingLogEntity);
    }

    async create(log: Omit<LenderRoutingLog, "id" | "createdAt">): Promise<LenderRoutingLog> {
        const entity = this.repository.create({
            leadId: log.leadId,
            lenderName: log.lenderName,
            decision: log.decision,
            reason: log.reason,
            leadData: log.leadData,
        });

        const saved = await this.repository.save(entity);
        return this.mapToLog(saved);
    }

    async findByLeadId(leadId: string): Promise<LenderRoutingLog[]> {
        const entities = await this.repository.find({
            where: { leadId },
            order: { createdAt: "DESC" },
        });
        return entities.map((entity) => this.mapToLog(entity));
    }

    private mapToLog(entity: LenderRoutingLogEntity): LenderRoutingLog {
        return {
            id: entity.id,
            leadId: entity.leadId,
            lenderName: entity.lenderName,
            decision: entity.decision as RoutingDecision,
            reason: entity.reason,
            leadData: entity.leadData as LenderRoutingLog["leadData"],
            createdAt: new Date(entity.createdAt),
        };
    }
}
