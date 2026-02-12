import type { FindManyOptions, FindOneOptions, Repository } from "typeorm";
import type { CreateLeadDto, Lead, LeadStatus, LenderResponseStatus } from "@/models";
import { AppDataSource } from "./data-source";
import { LeadEntity } from "./entities/lead.entity";
import { LeadSourceEntity } from "./entities/lead-source.entity";
import type { LenderResponseEntity } from "./entities/lender-response.entity";

export class LeadRepository {
    private readonly repository: Repository<LeadEntity>;
    private readonly sourceRepository: Repository<LeadSourceEntity>;

    constructor() {
        this.repository = AppDataSource.getRepository(LeadEntity);
        this.sourceRepository = AppDataSource.getRepository(LeadSourceEntity);
    }

    async findById(id: string): Promise<Lead | null> {
        const entity = await this.repository.findOne({
            where: { id },
            relations: ["sources", "lenderResponses"],
        } as FindOneOptions<LeadEntity>);
        return entity ? this.mapToLead(entity) : null;
    }

    async findByPhoneOrEmail(phone: string, email: string): Promise<Lead | null> {
        const entity = await this.repository.findOne({
            where: [{ phone }, { email }],
            relations: ["sources", "lenderResponses"],
        } as FindOneOptions<LeadEntity>);
        return entity ? this.mapToLead(entity) : null;
    }

    async findByPhone(phone: string): Promise<Lead | null> {
        const entity = await this.repository.findOne({
            where: { phone },
            relations: ["sources", "lenderResponses"],
        } as FindOneOptions<LeadEntity>);
        return entity ? this.mapToLead(entity) : null;
    }

    async create(leadData: CreateLeadDto): Promise<Lead> {
        const entity = this.repository.create({
            phone: leadData.phone,
            email: leadData.email,
            firstName: leadData.firstName,
            lastName: leadData.lastName,
            dateOfBirth: new Date(leadData.dateOfBirth),
            monthlyIncome: leadData.monthlyIncome,
            employmentType: leadData.employmentType,
            panNumber: leadData.panNumber,
            address: leadData.address,
            city: leadData.city,
            state: leadData.state,
            pincode: leadData.pincode,
            status: "new" as LeadStatus,
        });

        const saved = await this.repository.save(entity);

        // Create initial source
        const source = this.sourceRepository.create({
            leadId: saved.id,
            sourceName: leadData.source,
            receivedAt: new Date(),
            rawData: leadData as unknown as Record<string, unknown>,
        });
        await this.sourceRepository.save(source);

        return this.findById(saved.id) as Promise<Lead>;
    }

    async addSource(leadId: string, sourceName: string, rawData: Record<string, unknown>): Promise<void> {
        const source = this.sourceRepository.create({
            leadId,
            sourceName,
            receivedAt: new Date(),
            rawData,
        });
        await this.sourceRepository.save(source);
    }

    async updateStatus(id: string, status: LeadStatus): Promise<void> {
        await this.repository.update(id, { status });
    }

    async findLeadsNeedingRetry(): Promise<Lead[]> {
        const now = new Date();
        const entities = await this.repository
            .createQueryBuilder("lead")
            .innerJoin("lead.lenderResponses", "response")
            .where("response.status = :status", { status: "Deduped" as LenderResponseStatus })
            .andWhere("response.retry_after < :now", { now })
            .getMany();

        return entities.map((entity) => this.mapToLead(entity));
    }

    async findAll(options?: FindManyOptions<LeadEntity>): Promise<Lead[]> {
        const entities = await this.repository.find({
            ...options,
            relations: ["sources", "lenderResponses"],
        });
        return entities.map((entity) => this.mapToLead(entity));
    }

    private mapToLead(entity: LeadEntity): Lead {
        return {
            id: entity.id,
            phone: entity.phone,
            email: entity.email,
            firstName: entity.firstName,
            lastName: entity.lastName,
            dateOfBirth: new Date(entity.dateOfBirth),
            monthlyIncome: Number(entity.monthlyIncome),
            employmentType: entity.employmentType,
            panNumber: entity.panNumber,
            address: entity.address,
            city: entity.city,
            state: entity.state,
            pincode: entity.pincode,
            status: entity.status as LeadStatus,
            createdAt: new Date(entity.createdAt),
            updatedAt: new Date(entity.updatedAt),
            sources:
                entity.sources?.map((s: LeadSourceEntity) => ({
                    id: s.id,
                    leadId: s.leadId,
                    sourceName: s.sourceName,
                    receivedAt: new Date(s.receivedAt),
                    rawData: s.rawData,
                })) || [],
            lenderResponses:
                entity.lenderResponses?.map((r: LenderResponseEntity) => ({
                    id: r.id,
                    leadId: r.leadId,
                    lenderId: r.lenderId,
                    lenderName: r.lenderName,
                    status: r.status as LenderResponseStatus,
                    responseData: (r.responseData as Record<string, unknown>) || {},
                    sentAt: new Date(r.sentAt),
                    respondedAt: r.respondedAt ? new Date(r.respondedAt) : null,
                    retryAfter: r.retryAfter ? new Date(r.retryAfter) : undefined,
                })) || [],
        };
    }
}
