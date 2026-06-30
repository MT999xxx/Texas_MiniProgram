import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AdminNotificationType {
  ORDER = 'ORDER',
  RESERVATION = 'RESERVATION',
  SYSTEM = 'SYSTEM',
  WARNING = 'WARNING',
}

@Entity('admin_notifications')
export class AdminNotificationEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ enum: AdminNotificationType })
  @Column({ type: 'enum', enum: AdminNotificationType })
  type!: AdminNotificationType;

  @ApiProperty({ description: '标题' })
  @Column({ length: 100 })
  title!: string;

  @ApiProperty({ description: '内容' })
  @Column({ length: 255 })
  content!: string;

  @ApiPropertyOptional({ description: '来源类型' })
  @Column({ length: 32, nullable: true, name: 'source_type' })
  sourceType?: string;

  @ApiPropertyOptional({ description: '来源ID' })
  @Column({ length: 64, nullable: true, name: 'source_id' })
  sourceId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @Column({ nullable: true, name: 'read_at' })
  readAt?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}

