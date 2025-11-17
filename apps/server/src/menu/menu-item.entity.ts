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
  @Column({ length: 120, nullable: true })
  desc?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
