import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { MenuItemEntity } from '../menu/menu-item.entity';

@Entity('order_items')
export class OrderItemEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => OrderEntity })
  @ManyToOne(() => OrderEntity, (order) => order.items)
  order!: OrderEntity;

  @ApiProperty({ type: () => MenuItemEntity })
  @ManyToOne(() => MenuItemEntity, { eager: true })
  menuItem!: MenuItemEntity;

  @ApiProperty({ description: '数量' })
  @Column({ type: 'int' })
  quantity!: number;

  @ApiProperty({ description: '金额' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;
}
