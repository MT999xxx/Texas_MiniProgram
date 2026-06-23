import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MenuCategoryEntity } from './menu-category.entity';

export enum MenuItemStatus {
  ON_SALE = 'ON_SALE',
  OFF_SHELF = 'OFF_SHELF',
  SOLD_OUT = 'SOLD_OUT',
}

@Entity('menu_items')
export class MenuItemEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => MenuCategoryEntity })
  @ManyToOne(() => MenuCategoryEntity, (category) => category.items, { eager: true })
  category!: MenuCategoryEntity;

  @ApiProperty({ description: '菜品名称' })
  @Column({ length: 64 })
  name!: string;

  @ApiProperty({ description: '单价' })
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price!: number;

  @ApiProperty({ description: '库存' })
  @Column({ type: 'int' })
  stock!: number;

  @ApiProperty({ enum: MenuItemStatus })
  @Column({ type: 'enum', enum: MenuItemStatus, default: MenuItemStatus.ON_SALE })
  status!: MenuItemStatus;

  @ApiPropertyOptional({ description: '说明' })
  @Column({ length: 120, nullable: true, name: 'description' })
  description?: string;

  @ApiPropertyOptional({ description: '菜品图片URL' })
  @Column({ length: 255, nullable: true, name: 'image_url' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: '半打价格（6瓶）' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'half_dozen_price' })
  halfDozenPrice?: number;

  @ApiPropertyOptional({ description: '一打价格（12瓶）' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'dozen_price' })
  dozenPrice?: number;

  @ApiPropertyOptional({ description: '是否可用酒卷支付（仅鸡尾酒类有效）' })
  @Column({ type: 'boolean', default: false, name: 'voucher_eligible' })
  voucherEligible!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
