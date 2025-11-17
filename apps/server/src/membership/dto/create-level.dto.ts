import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLevelDto {
  @ApiProperty({ description: '等级编码', maxLength: 24 })
  @IsString()
  @MaxLength(24)
  code!: string;

  @ApiProperty({ description: '等级名称', maxLength: 48 })
  @IsString()
  @MaxLength(48)
  name!: string;

  @ApiProperty({ description: '积分门槛', minimum: 0 })
  @IsNumber()
  @Min(0)
  threshold!: number;

  @ApiPropertyOptional({ description: '折扣(0-1)', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: '权益描述', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  benefits?: string;
}
