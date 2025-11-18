import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  MaxLength,
  MinDate
} from 'class-validator';
import { EventType, EventStatus } from '../event.entity';

export class CreateEventDto {
  @ApiProperty({ description: '活动名称', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: '活动描述' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: '活动封面图片' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({ enum: EventType, description: '活动类型' })
  @IsEnum(EventType)
  type!: EventType;

  @ApiProperty({ description: '开始时间' })
  @IsDate()
  @Type(() => Date)
  @MinDate(new Date(), { message: '开始时间不能早于当前时间' })
  startTime!: Date;

  @ApiProperty({ description: '结束时间' })
  @IsDate()
  @Type(() => Date)
  endTime!: Date;

  @ApiProperty({ description: '最大参与人数', minimum: 0 })
  @IsInt()
  @Min(0)
  maxParticipants!: number;

  @ApiProperty({ description: '报名费用（积分）', minimum: 0 })
  @IsInt()
  @Min(0)
  entryFee!: number;

  @ApiProperty({ description: '奖励积分', minimum: 0 })
  @IsInt()
  @Min(0)
  rewardPoints!: number;

  @ApiPropertyOptional({ description: '活动规则' })
  @IsString()
  @IsOptional()
  rules?: string;

  @ApiPropertyOptional({ description: '活动地点' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: '是否需要报名' })
  @IsBoolean()
  requiresRegistration!: boolean;

  @ApiProperty({ description: '最低会员等级要求', minimum: 1 })
  @IsInt()
  @Min(1)
  minMemberLevel!: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: '活动名称', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '活动描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '活动封面图片' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({ enum: EventType, description: '活动类型' })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiPropertyOptional({ enum: EventStatus, description: '活动状态' })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({ description: '最大参与人数', minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: '报名费用（积分）', minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  entryFee?: number;

  @ApiPropertyOptional({ description: '奖励积分', minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  rewardPoints?: number;

  @ApiPropertyOptional({ description: '活动规则' })
  @IsString()
  @IsOptional()
  rules?: string;

  @ApiPropertyOptional({ description: '活动地点' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '是否需要报名' })
  @IsBoolean()
  @IsOptional()
  requiresRegistration?: boolean;

  @ApiPropertyOptional({ description: '最低会员等级要求', minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  minMemberLevel?: number;
}

export class RegisterEventDto {
  @ApiProperty({ description: '会员ID' })
  @IsString()
  memberId!: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string;
}