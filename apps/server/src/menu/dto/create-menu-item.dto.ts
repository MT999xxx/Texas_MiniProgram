import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
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
  @IsPositive()
  price!: number;

  @ApiProperty({ description: '初始库存', minimum: 0 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ enum: MenuItemStatus, default: MenuItemStatus.ON_SALE })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus = MenuItemStatus.ON_SALE;

  @ApiPropertyOptional({ description: '描述', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  desc?: string;
}
