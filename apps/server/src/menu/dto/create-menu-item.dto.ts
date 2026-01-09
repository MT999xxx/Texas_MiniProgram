import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MenuItemStatus } from '../menu-item.entity';

export class CreateMenuItemDto {
  @ApiProperty({ description: '菜品名称', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiProperty({ description: '分类ID' })
  @IsString()
  @MaxLength(36)
  categoryId!: string;

  @ApiProperty({ description: '单价', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiProperty({ description: '初始库存', minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @ApiPropertyOptional({ enum: MenuItemStatus, default: MenuItemStatus.ON_SALE })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus = MenuItemStatus.ON_SALE;

  @ApiPropertyOptional({ description: '描述', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  description?: string;

  @ApiPropertyOptional({ description: '菜品图片URL', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl?: string;

  @ApiPropertyOptional({ description: '半打价格（12瓶）', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  halfDozenPrice?: number;

  @ApiPropertyOptional({ description: '一打价格（24瓶）', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  dozenPrice?: number;
}
