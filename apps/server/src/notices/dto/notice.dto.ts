import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { NoticeType } from '../notice.entity';

export class CreateNoticeDto {
    @ApiProperty({ enum: NoticeType, description: '类型' })
    @IsEnum(NoticeType)
    @IsNotEmpty()
    type!: NoticeType;

    @ApiProperty({ description: '标题' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title!: string;

    @ApiProperty({ description: '内容' })
    @IsString()
    @IsNotEmpty()
    content!: string;

    @ApiPropertyOptional({ description: '是否激活' })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateNoticeDto {
    @ApiPropertyOptional({ description: '标题' })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    title?: string;

    @ApiPropertyOptional({ description: '内容' })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional({ description: '是否激活' })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
