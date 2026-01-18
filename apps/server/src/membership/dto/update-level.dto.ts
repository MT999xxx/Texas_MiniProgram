import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLevelDto {
    @ApiProperty({ description: '新的会员等级编码，传 null 清除等级', required: false })
    @IsOptional()
    @IsString()
    levelCode?: string | null;
}
