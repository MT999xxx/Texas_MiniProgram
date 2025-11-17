import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ description: '更新后的库存', minimum: 0 })
  @IsInt()
  @Min(0)
  stock!: number;
}
