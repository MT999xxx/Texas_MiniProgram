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

export enum EventStatus {
  UPCOMING = 'UPCOMING',   // 即将开始
  ONGOING = 'ONGOING',     // 进行中
  ENDED = 'ENDED',         // 已结束
  CANCELLED = 'CANCELLED', // 已取消
}

export enum EventType {
  TOURNAMENT = 'TOURNAMENT',      // 比赛
  PROMOTION = 'PROMOTION',        // 促销活动
  SPECIAL = 'SPECIAL',            // 特殊活动
  HOLIDAY = 'HOLIDAY',            // 节日活动
}

@Entity('events')
export class EventEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '活动名称' })
  @Column({ length: 100 })
  name!: string;

  @ApiProperty({ description: '活动描述' })
  @Column({ type: 'text' })
  description!: string;

  @ApiPropertyOptional({ description: '活动封面图片' })
  @Column({ nullable: true })
  coverImage?: string;

  @ApiProperty({ enum: EventType, description: '活动类型' })
  @Column({ type: 'enum', enum: EventType })
  type!: EventType;

  @ApiProperty({ enum: EventStatus, description: '活动状态' })
  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.UPCOMING })
  status!: EventStatus;

  @ApiProperty({ description: '开始时间' })
  @Column({ type: 'timestamp' })
  startTime!: Date;

  @ApiProperty({ description: '结束时间' })
  @Column({ type: 'timestamp' })
  endTime!: Date;

  @ApiProperty({ description: '最大参与人数' })
  @Column({ type: 'int', default: 0 })
  maxParticipants!: number;

  @ApiProperty({ description: '当前报名人数' })
  @Column({ type: 'int', default: 0 })
  currentParticipants!: number;

  @ApiProperty({ description: '报名费用（积分）' })
  @Column({ type: 'int', default: 0 })
  entryFee!: number;

  @ApiProperty({ description: '奖励积分' })
  @Column({ type: 'int', default: 0 })
  rewardPoints!: number;

  @ApiPropertyOptional({ description: '活动规则' })
  @Column({ type: 'text', nullable: true })
  rules?: string;

  @ApiPropertyOptional({ description: '活动地点' })
  @Column({ nullable: true })
  location?: string;

  @ApiProperty({ description: '是否需要报名' })
  @Column({ default: true })
  requiresRegistration!: boolean;

  @ApiProperty({ description: '最低会员等级要求' })
  @Column({ type: 'int', default: 1 })
  minMemberLevel!: number;

  @ApiProperty({ type: () => [EventRegistrationEntity] })
  @OneToMany(() => EventRegistrationEntity, (registration) => registration.event)
  registrations!: EventRegistrationEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',   // 已报名
  CONFIRMED = 'CONFIRMED',     // 已确认
  ATTENDED = 'ATTENDED',       // 已参加
  ABSENT = 'ABSENT',           // 缺席
  CANCELLED = 'CANCELLED',     // 已取消
}

@Entity('event_registrations')
export class EventRegistrationEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => EventEntity })
  @ManyToOne(() => EventEntity, (event) => event.registrations)
  event!: EventEntity;

  @ApiProperty({ type: () => MemberEntity })
  @ManyToOne(() => MemberEntity, (member) => member.eventRegistrations)
  member!: MemberEntity;

  @ApiProperty({ enum: RegistrationStatus, description: '报名状态' })
  @Column({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.REGISTERED })
  status!: RegistrationStatus;

  @ApiProperty({ description: '报名时间' })
  @CreateDateColumn()
  registeredAt!: Date;

  @ApiPropertyOptional({ description: '备注' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional({ description: '获得积分' })
  @Column({ type: 'int', default: 0 })
  pointsEarned!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt!: Date;
}