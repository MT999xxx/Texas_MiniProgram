import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** 商品规格类型：单瓶、半打（6瓶）、一打（12瓶） */
export enum SpecType {
  SINGLE = 'single',
  HALF_DOZEN = 'half_dozen',
  DOZEN = 'dozen',
}

export class CreateOrderItemDto {
  @ApiProperty({ description: '菜品ID' })
  @IsString()
  menuItemId!: string;

  @ApiProperty({ description: '数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ enum: SpecType, description: '规格类型：single(单瓶)/half_dozen(半打)/dozen(一打)' })
  @IsOptional()
  @IsEnum(SpecType)
  specType?: SpecType;
}
