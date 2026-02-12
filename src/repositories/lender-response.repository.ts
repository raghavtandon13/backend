import { LessThan, type Repository } from "typeorm";
import type { LenderResponse, LenderResponseStatus } from "@/models";
import { AppDataSource } from "./data-source";
import { LenderResponseEntity } from "./entities/lender-response.entity";

export class LenderResponseRepository {
    private readonly repository: Repository<LenderResponseEntity>;

    constructor() {
        this.repository = AppDataSource.getRepository(LenderResponseEntity);
    }

    async create(response: Omit<LenderResponse, "id" | "createdAt">): Promise<LenderResponse> {
        const entity = this.repository.create({
            leadId: response.leadId,
            lenderId: response.lenderId,
            lenderName: response.lenderName,
            status: response.status,
            responseData: response.responseData,
            sentAt: response.sentAt,
            respondedAt: response.respondedAt,
            retryAfter: response.retryAfter,
        });

        const saved = await this.repository.save(entity);
        return this.mapToResponse(saved);
    }

    async findByLeadAndLender(leadId: string, lenderId: string): Promise<LenderResponse | null> {
        const entity = await this.repository.findOne({
            where: { leadId, lenderId },
            order: { sentAt: "DESC" },
        });
        return entity ? this.mapToResponse(entity) : null;
    }

    async findDedupedResponsesReadyForRetry(): Promise<LenderResponse[]> {
        const now = new Date();
        const entities = await this.repository.find({
            where: {
                status: "Deduped" as LenderResponseStatus,
                retryAfter: LessThan(now),
            },
            relations: ["lead"],
        });
        return entities.map((entity) => this.mapToResponse(entity));
    }

    async updateResponse(
        id: string,
        updates: Partial<Pick<LenderResponse, "status" | "responseData" | "respondedAt" | "retryAfter">>,
    ): Promise<void> {
        const updateData: Record<string, unknown> = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.responseData) updateData.responseData = updates.responseData;
        if (updates.respondedAt !== undefined) updateData.respondedAt = updates.respondedAt;
        if (updates.retryAfter !== undefined) updateData.retryAfter = updates.retryAfter;

        await this.repository.update(id, updateData);
    }

    private mapToResponse(entity: LenderResponseEntity): LenderResponse {
        return {
            id: entity.id,
            leadId: entity.leadId,
            lenderId: entity.lenderId,
            lenderName: entity.lenderName,
            status: entity.status as LenderResponseStatus,
            responseData: (entity.responseData as Record<string, unknown>) || {},
            sentAt: new Date(entity.sentAt),
            respondedAt: entity.respondedAt ? new Date(entity.respondedAt) : null,
            retryAfter: entity.retryAfter ? new Date(entity.retryAfter) : undefined,
        };
    }
}
