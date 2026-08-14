import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberEntity } from './member.entity';

export enum MembershipRewardGrantStatus {
  PENDING = 'PENDING',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
}

@Entity('membership_reward_grants')
@Index('UQ_membership_reward_member_level', ['memberId', 'levelCode'], { unique: true })
export class MembershipRewardGrantEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity)
  @JoinColumn({ name: 'member_id' })
  member!: MemberEntity;

  @ApiProperty()
  @Column({ name: 'member_id', length: 36 })
  memberId!: string;

  @ApiProperty()
  @Column({ name: 'level_code', length: 24 })
  levelCode!: string;

  @ApiProperty()
  @Column({ name: 'level_name', length: 48 })
  levelName!: string;

  @ApiProperty({ description: '触发等级的累计充值门槛（元）' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  threshold!: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  points!: number;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  coins!: number;

  @ApiProperty()
  @Column({ name: 'wine_vouchers', type: 'int', default: 0 })
  wineVouchers!: number;

  @ApiProperty()
  @Column({ name: 'monthly_tickets', type: 'int', default: 0 })
  monthlyTickets!: number;

  @ApiProperty({ enum: MembershipRewardGrantStatus })
  @Column({ type: 'enum', enum: MembershipRewardGrantStatus, default: MembershipRewardGrantStatus.PENDING })
  status!: MembershipRewardGrantStatus;

  @ApiPropertyOptional()
  @Column({ length: 255, nullable: true })
  remark?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Column({ name: 'issued_at', type: 'timestamp', nullable: true })
  issuedAt?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
