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
import { TableEntity } from '../tables/table.entity';
import { OrderEntity } from '../orders/order.entity';
import { MemberEntity } from '../membership/member.entity';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
}

@Entity('reservations')
export class ReservationEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column({ length: 64 })
  customerName!: string;

  @ApiProperty()
  @Column({ length: 32 })
  phone!: string;

  @ApiProperty({ description: '就餐人数' })
  @Column({ type: 'int', default: 1 })
  partySize!: number;

  @ApiProperty({ enum: ReservationStatus })
  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status!: ReservationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  @Column({ type: 'datetime' })
  reservedAt!: Date;

  @ApiPropertyOptional({ description: '备注' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  note?: string;

  @ApiProperty({ type: () => TableEntity })
  @ManyToOne(() => TableEntity, (table) => table.reservations, { eager: true })
  table!: TableEntity;

  @ApiPropertyOptional({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity, { nullable: true })
  member?: MemberEntity;

  @Column({ name: 'member_id', nullable: true })
  memberId?: string;

  @ApiPropertyOptional({ type: () => [OrderEntity] })
  @OneToMany(() => OrderEntity, (order) => order.reservation)
  orders!: OrderEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
