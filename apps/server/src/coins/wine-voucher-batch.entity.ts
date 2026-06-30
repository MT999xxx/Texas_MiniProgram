import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MemberEntity } from '../membership/member.entity';

@Entity('wine_voucher_batches')
export class WineVoucherBatchEntity {
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

  @ApiProperty({ description: '来源：member_purchase / menu_order / admin' })
  @Column({ name: 'source_type', length: 32 })
  sourceType!: string;

  @ApiPropertyOptional({ description: '来源订单或套餐ID' })
  @Column({ name: 'source_id', length: 64, nullable: true })
  sourceId?: string;

  @ApiPropertyOptional({ description: '酒券套餐名' })
  @Column({ name: 'package_name', length: 100, nullable: true })
  packageName?: string;

  @ApiProperty({ description: '发放数量' })
  @Column({ type: 'int' })
  quantity!: number;

  @ApiProperty({ description: '剩余数量' })
  @Column({ name: 'remaining_quantity', type: 'int' })
  remainingQuantity!: number;

  @ApiProperty({ description: '本批次赠送积分' })
  @Column({ name: 'bonus_points', type: 'int', default: 0 })
  bonusPoints!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @ApiPropertyOptional({ description: '备注' })
  @Column({ length: 255, nullable: true })
  remark?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
