import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WineVoucherRedeemItemEntity } from './wine-voucher-redeem-item.entity';

@Entity('wine_voucher_redeem_options')
export class WineVoucherRedeemOptionEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '兑换项名称' })
  @Column({ length: 100 })
  name!: string;

  @ApiPropertyOptional({ description: '兑换项说明' })
  @Column({ length: 255, nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: '限定可使用的酒券套餐ID，空值表示通用' })
  @Column({ length: 64, nullable: true, name: 'voucher_package_id' })
  voucherPackageId?: string;

  @ApiProperty({ description: '需要消耗的酒券数量' })
  @Column({ type: 'int', default: 1, name: 'required_voucher_count' })
  requiredVoucherCount!: number;

  @ApiProperty({ description: '是否启用' })
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @ApiProperty({ description: '排序值' })
  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @ApiProperty({ type: () => [WineVoucherRedeemItemEntity] })
  @OneToMany(() => WineVoucherRedeemItemEntity, (item) => item.option, {
    cascade: true,
    eager: true,
  })
  items!: WineVoucherRedeemItemEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}

