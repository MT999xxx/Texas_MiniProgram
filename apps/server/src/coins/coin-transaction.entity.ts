import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { MemberEntity } from '../membership/member.entity';

export enum CoinTransactionType {
    RECHARGE = 'RECHARGE',      // 充值
    EXCHANGE = 'EXCHANGE',      // 积分兑换
    CONSUME = 'CONSUME',        // 消费
    WITHDRAW = 'WITHDRAW',      // 取积分
}

export enum CoinTransactionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

@Entity('coin_transactions')
export class CoinTransactionEntity {
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

    @ApiProperty({ enum: CoinTransactionType })
    @Column({ type: 'enum', enum: CoinTransactionType })
    type!: CoinTransactionType;

    @ApiProperty({ description: '金币数量' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @ApiPropertyOptional({ description: '支付金额（仅充值）' })
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    paymentAmount?: number;

    @ApiPropertyOptional({ description: '微信支付订单号' })
    @Column({ length: 64, nullable: true })
    transactionId?: string;

    @ApiPropertyOptional({ description: '兑换消耗的积分' })
    @Column({ type: 'int', nullable: true })
    pointsUsed?: number;

    @ApiProperty({ enum: CoinTransactionStatus })
    @Column({ type: 'enum', enum: CoinTransactionStatus, default: CoinTransactionStatus.PENDING })
    status!: CoinTransactionStatus;

    @ApiPropertyOptional({ description: '备注' })
    @Column({ length: 255, nullable: true })
    remark?: string;

    @ApiProperty({ type: String, format: 'date-time' })
    @CreateDateColumn()
    createdAt!: Date;
}
