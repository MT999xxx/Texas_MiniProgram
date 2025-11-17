import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReservationStatus } from '../reservation.entity';

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

  @ApiProperty({ description: '桌位ID' })
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty({ description: '预约时间', type: String, format: 'date-time' })
  @IsDateString()
  reservedAt!: string;

  @ApiPropertyOptional({ description: '备注', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string;
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}
