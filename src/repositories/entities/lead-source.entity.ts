import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { LeadEntity } from "./lead.entity";

@Entity("lead_sources")
export class LeadSourceEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ name: "lead_id", type: "uuid" })
    leadId!: string;

    @Column({ name: "source_name", type: "varchar", length: 100 })
    sourceName!: string;

    @Column({ name: "received_at", type: "timestamp" })
    receivedAt!: Date;

    @Column({ name: "raw_data", type: "jsonb" })
    rawData!: Record<string, unknown>;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @ManyToOne(
        () => LeadEntity,
        (lead) => lead.sources,
    )
    @JoinColumn({ name: "lead_id" })
    lead!: LeadEntity;
}
