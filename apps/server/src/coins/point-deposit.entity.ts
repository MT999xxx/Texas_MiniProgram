import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { MemberEntity } from '../membership/member.entity';

export enum PointDepositStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

@Entity('point_deposits')
export class PointDepositEntity {
    @ApiProperty({ format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ApiProperty({ type: () => MemberEntity })
    @ManyToOne(() => MemberEntity)
    @JoinColumn({ name: 'memberId' })
    member!: MemberEntity;

    @ApiProperty()
    @Column({ length: 36 })
    memberId!: string;

    @ApiProperty({ description: '申请存入积分' })
    @Column({ type: 'int' })
    points!: number;

    @ApiPropertyOptional({ description: '实际存入积分（5000以内部分）' })
    @Column({ type: 'int', nullable: true })
    actualPoints?: number;

    @ApiPropertyOptional({ description: '兑换的抽奖次数（超出5000部分）' })
    @Column({ type: 'int', nullable: true })
    lotteryChances?: number;

    @ApiProperty({ enum: PointDepositStatus })
    @Column({ type: 'enum', enum: PointDepositStatus, default: PointDepositStatus.PENDING })
    status!: PointDepositStatus;

    @ApiPropertyOptional({ description: '审核人ID' })
    @Column({ length: 36, nullable: true })
    reviewedBy?: string;

    @ApiPropertyOptional({ description: '审核时间' })
    @Column({ type: 'datetime', nullable: true })
    reviewedAt?: Date;

    @ApiPropertyOptional({ description: '审核备注' })
    @Column({ length: 255, nullable: true })
    reviewRemark?: string;

    @ApiProperty({ type: String, format: 'date-time' })
    @CreateDateColumn()
    createdAt!: Date;
}
