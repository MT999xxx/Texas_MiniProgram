import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TableCategory } from '../table.entity';

export class UpdateTableDto {
    @ApiProperty({ description: '桌位名称', example: '主桌A1' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name?: string;

    @ApiProperty({ description: '桌位类别', enum: TableCategory, example: TableCategory.MAIN })
    @IsOptional()
    @IsEnum(TableCategory)
    category?: TableCategory;

    @ApiProperty({ description: '容量', example: 9, minimum: 1, maximum: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(20)
    capacity?: number;
}
