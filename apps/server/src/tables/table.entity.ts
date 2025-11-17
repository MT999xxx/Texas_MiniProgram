import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ReservationEntity } from '../reservation/reservation.entity';

export enum TableCategory {
  MAIN = 'MAIN',
  SIDE = 'SIDE',
  DINING = 'DINING',
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('tables')
export class TableEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '桌名' })
  @Column({ length: 32 })
  name!: string;

  @ApiProperty({ enum: TableCategory })
  @Column({ type: 'enum', enum: TableCategory })
  category!: TableCategory;

  @ApiProperty({ description: '容量' })
  @Column({ type: 'int' })
  capacity!: number;

  @ApiProperty({ enum: TableStatus })
  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status!: TableStatus;

  @ApiProperty({ description: '是否启用' })
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ApiPropertyOptional({ type: () => [ReservationEntity] })
  @OneToMany(() => ReservationEntity, (reservation) => reservation.table)
  reservations!: ReservationEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
