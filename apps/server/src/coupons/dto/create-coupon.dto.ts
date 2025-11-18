import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CouponType, CouponStatus } from '../coupon.entity';

export class CreateCouponDto {
  @ApiProperty({ description: '优惠券名称', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: '优惠券描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiProperty({ description: '优惠券面值/折扣值' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ description: '最低消费金额' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: '最大折扣金额' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ description: '发行总量' })
  @IsInt()
  @Min(1)
  totalQuantity!: number;

  @ApiPropertyOptional({ description: '每人限领数量' })
  @IsInt()
  @IsOptional()
  @Min(1)
  limitPerUser?: number;

  @ApiPropertyOptional({ description: '会员等级要求' })
  @IsInt()
  @IsOptional()
  @Min(1)
  minMemberLevel?: number;

  @ApiProperty({ description: '生效时间', type: String, format: 'date-time' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: '过期时间', type: String, format: 'date-time' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ description: '领取后有效天数' })
  @IsInt()
  @IsOptional()
  @Min(1)
  validDays?: number;
}

export class ClaimCouponDto {
  @ApiProperty({ description: '会员ID' })
  @IsString()
  memberId!: string;
}