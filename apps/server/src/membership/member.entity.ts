import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MembershipLevelEntity } from './membership-level.entity';
import { OrderEntity } from '../orders/order.entity';
import { LoyaltyTransactionEntity } from '../loyalty/loyalty-transaction.entity';

@Entity('members')
export class MemberEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '用户标识（OpenID）' })
  @Column({ length: 64 })
  userId!: string;

  @ApiProperty({ description: '手机号' })
  @Column({ length: 32 })
  phone!: string;

  @ApiPropertyOptional({ description: '昵称' })
  @Column({ length: 48, nullable: true })
  nickname?: string;

  @ApiPropertyOptional({ type: () => MembershipLevelEntity })
  @ManyToOne(() => MembershipLevelEntity, (level) => level.members, { nullable: true })
  @JoinColumn({ name: 'levelCode' })
  level?: MembershipLevelEntity;

  @ApiPropertyOptional({ description: '等级编码' })
  @Column({ length: 24, nullable: true })
  levelCode?: string;

  @ApiProperty({ description: '积分' })
  @Column({ type: 'int', default: 0 })
  points!: number;

  @ApiPropertyOptional({ type: () => [OrderEntity] })
  @OneToMany(() => OrderEntity, (order) => order.member)
  orders!: OrderEntity[];

  @ApiPropertyOptional({ type: () => [LoyaltyTransactionEntity] })
  @OneToMany(() => LoyaltyTransactionEntity, (trx) => trx.member)
  loyaltyTransactions!: LoyaltyTransactionEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
