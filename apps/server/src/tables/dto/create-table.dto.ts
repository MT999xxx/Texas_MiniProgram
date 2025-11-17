import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { TableCategory } from '../table.entity';

export class CreateTableDto {
  @ApiProperty({ description: '桌位名称', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  name!: string;

  @ApiProperty({ enum: TableCategory, description: '桌位类型' })
  @IsEnum(TableCategory)
  category!: TableCategory;

  @ApiProperty({ description: '可容纳人数', minimum: 1 })
  @IsInt()
  @IsPositive()
  capacity!: number;

  @ApiPropertyOptional({ description: '是否可用', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
