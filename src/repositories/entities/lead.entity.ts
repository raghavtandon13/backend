import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EmploymentType, LeadStatus } from "@/models";
import { LeadSourceEntity } from "./lead-source.entity";
import { LenderResponseEntity } from "./lender-response.entity";

@Entity("leads")
@Index(["phone"], { unique: true })
@Index(["email"], { unique: true })
export class LeadEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 20 })
    phone!: string;

    @Column({ type: "varchar", length: 255 })
    email!: string;

    @Column({ name: "first_name", type: "varchar", length: 100 })
    firstName!: string;

    @Column({ name: "last_name", type: "varchar", length: 100 })
    lastName!: string;

    @Column({ name: "date_of_birth", type: "date" })
    dateOfBirth!: Date;

    @Column({ name: "monthly_income", type: "decimal", precision: 12, scale: 2 })
    monthlyIncome!: number;

    @Column({ name: "employment_type", type: "enum", enum: EmploymentType })
    employmentType!: EmploymentType;

    @Column({ name: "pan_number", type: "varchar", length: 10 })
    panNumber!: string;

    @Column({ type: "text" })
    address!: string;

    @Column({ type: "varchar", length: 100 })
    city!: string;

    @Column({ type: "varchar", length: 100 })
    state!: string;

    @Column({ type: "varchar", length: 10 })
    pincode!: string;

    @Column({
        type: "enum",
        enum: LeadStatus,
        default: LeadStatus.NEW,
    })
    status!: LeadStatus;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    @OneToMany(
        () => LeadSourceEntity,
        (source) => source.lead,
        { cascade: true },
    )
    sources!: LeadSourceEntity[];

    @OneToMany(
        () => LenderResponseEntity,
        (response) => response.lead,
        { cascade: true },
    )
    lenderResponses!: LenderResponseEntity[];
}
