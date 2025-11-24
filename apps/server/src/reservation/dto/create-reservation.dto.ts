import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ReservationStatus } from '../reservation.entity';
import { PaymentMethod } from '../../payment/payment.entity';

export class CreateReservationDto {
  @ApiProperty({ description: '顾客姓名', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerName!: string;

  @ApiProperty({ description: '联系电话', maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  @ApiProperty({ description: '就餐人数' })
  @IsInt()
  @Min(1)
  partySize!: number;

  @ApiProperty({ description: '桌位ID' })
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty({ description: '预约时间', type: String, format: 'date-time' })
  @IsDateString()
  reservedAt!: string;

  @ApiPropertyOptional({ description: '会员ID' })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ description: '备注', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string;
}

export class CreateReservationWithDepositDto extends CreateReservationDto {
  @ApiProperty({ description: '订金金额（元）' })
  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @ApiProperty({ enum: PaymentMethod, description: '支付方式', default: PaymentMethod.WECHAT_PAY })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: '用户openid（微信支付需要）' })
  @IsString()
  @IsOptional()
  openid?: string;
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}
