import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiPropertyOptional({ description: '会员ID' })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ description: '预约ID' })
  @IsString()
  @IsOptional()
  reservationId?: string;

  @ApiPropertyOptional({ description: '桌位ID' })
  @IsString()
  @IsOptional()
  tableId?: string;

  @ApiPropertyOptional({ description: '用户优惠券ID' })
  @IsString()
  @IsOptional()
  userCouponId?: string;

  @ApiProperty({ type: [CreateOrderItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: '商品原价总额' })
  @IsNumber()
  @IsOptional()
  originalAmount?: number;

  @ApiPropertyOptional({ description: '优惠券折扣金额' })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ description: '实付总金额' })
  @IsNumber()
  @IsOptional()
  finalAmount?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  note?: string;
}
