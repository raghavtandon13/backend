import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { LenderResponseStatus } from "@/models";
import { LeadEntity } from "./lead.entity";

@Entity("lender_responses")
@Index(["leadId", "lenderId"])
@Index(["status"])
@Index(["retryAfter"])
export class LenderResponseEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ name: "lead_id", type: "uuid" })
    leadId!: string;

    @Column({ name: "lender_id", type: "varchar", length: 100 })
    lenderId!: string;

    @Column({ name: "lender_name", type: "varchar", length: 100 })
    lenderName!: string;

    @Column({
        type: "enum",
        enum: LenderResponseStatus,
    })
    status!: LenderResponseStatus;

    @Column({ name: "response_data", type: "jsonb", nullable: true })
    responseData!: Record<string, unknown> | null;

    @Column({ name: "sent_at", type: "timestamp" })
    sentAt!: Date;

    @Column({ name: "responded_at", type: "timestamp", nullable: true })
    respondedAt!: Date | null;

    @Column({ name: "retry_after", type: "timestamp", nullable: true })
    retryAfter!: Date | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @ManyToOne(
        () => LeadEntity,
        (lead) => lead.lenderResponses,
    )
    @JoinColumn({ name: "lead_id" })
    lead!: LeadEntity;
}
