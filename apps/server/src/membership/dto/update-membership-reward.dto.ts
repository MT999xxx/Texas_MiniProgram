import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMembershipRewardDto {
  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  coins?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  wineVouchers?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  monthlyTickets?: number;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  remark?: string;
}
