import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsOptional, Min, IsUUID } from 'class-validator';
import { PaymentMethod, PaymentType } from '../payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentType, description: '支付类型' })
  @IsEnum(PaymentType)
  type!: PaymentType;

  @ApiProperty({ enum: PaymentMethod, description: '支付方式' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ description: '支付金额（分）', minimum: 1 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: '支付描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '会员ID' })
  @IsUUID()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ description: '订单ID' })
  @IsUUID()
  @IsOptional()
  orderId?: string;
}

export class OrderPaymentDto {
  @ApiProperty({ description: '订单ID' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: PaymentMethod, description: '支付方式' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: '用户IP' })
  @IsString()
  @IsOptional()
  userIp?: string;
}

export class RechargeDto {
  @ApiProperty({ description: '会员ID' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ description: '充值套餐ID' })
  @IsUUID()
  packageId!: string;

  @ApiProperty({ enum: PaymentMethod, description: '支付方式' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: '用户IP' })
  @IsString()
  @IsOptional()
  userIp?: string;
}

export class CreateRechargePackageDto {
  @ApiProperty({ description: '套餐名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '充值金额（分）', minimum: 1 })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: '获得积分', minimum: 1 })
  @IsNumber()
  @Min(1)
  points!: number;

  @ApiPropertyOptional({ description: '赠送积分', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonusPoints?: number;

  @ApiPropertyOptional({ description: '套餐描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '排序', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRechargePackageDto {
  @ApiPropertyOptional({ description: '套餐名称' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '充值金额（分）', minimum: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: '获得积分', minimum: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ description: '赠送积分', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonusPoints?: number;

  @ApiPropertyOptional({ description: '套餐描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '排序', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}

export class PaymentCallbackDto {
  @ApiProperty({ description: '支付订单号' })
  @IsString()
  paymentOrderNo!: string;

  @ApiProperty({ description: '第三方订单号' })
  @IsString()
  thirdPartyOrderNo!: string;

  @ApiPropertyOptional({ description: '实际支付金额（分）' })
  @IsNumber()
  @IsOptional()
  actualAmount?: number;

  @ApiPropertyOptional({ description: '回调数据' })
  @IsOptional()
  callbackData?: any;
}