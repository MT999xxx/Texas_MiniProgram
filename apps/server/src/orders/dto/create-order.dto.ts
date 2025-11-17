import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
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

  @ApiProperty({ type: [CreateOrderItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
