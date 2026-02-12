import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { RoutingDecision } from "@/models";

@Entity("lender_routing_logs")
@Index(["leadId"])
@Index(["lenderName"])
@Index(["createdAt"])
export class LenderRoutingLogEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ name: "lead_id", type: "uuid" })
    leadId!: string;

    @Column({ name: "lender_name", type: "varchar", length: 100 })
    lenderName!: string;

    @Column({
        type: "enum",
        enum: RoutingDecision,
    })
    decision!: RoutingDecision;

    @Column({ name: "reason", type: "text", nullable: true })
    reason!: string | null;

    @Column({ name: "lead_data", type: "jsonb" })
    leadData!: {
        monthlyIncome: number;
        age: number;
        employmentType: string;
        state: string;
    };

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;
}
