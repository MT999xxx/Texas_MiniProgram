import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  name!: string;

  @ApiPropertyOptional({ description: '排序（越小越前）', default: 1, minimum: 1 })
  @IsInt()
  @IsOptional()
  @IsPositive()
  sort?: number = 1;
}
