import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AdjustPointsDto {
  @ApiProperty({ description: '积分增量（可为负数）' })
  @IsInt()
  delta!: number;
}
