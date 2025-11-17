import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberEntity } from '../membership/member.entity';
import { ReservationEntity } from '../reservation/reservation.entity';
import { TableEntity } from '../tables/table.entity';
import { OrderItemEntity } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class OrderEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiPropertyOptional({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity, (member) => member.orders, { nullable: true, eager: true })
  member?: MemberEntity;

  @ApiPropertyOptional({ type: () => ReservationEntity })
  @ManyToOne(() => ReservationEntity, (reservation) => reservation.orders, { nullable: true, eager: true })
  reservation?: ReservationEntity;

  @ApiPropertyOptional({ type: () => TableEntity })
  @ManyToOne(() => TableEntity, { nullable: true, eager: true })
  table?: TableEntity;

  @ApiProperty({ description: '总金额' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @ApiProperty({ enum: OrderStatus })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @ApiProperty({ type: () => [OrderItemEntity] })
  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItemEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
