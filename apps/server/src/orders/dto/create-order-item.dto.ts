import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: '菜品ID' })
  @IsString()
  menuItemId!: string;

  @ApiProperty({ description: '数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
