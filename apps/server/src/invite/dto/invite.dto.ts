import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class BindInviteCodeDto {
    @ApiProperty({ description: '邀请码', example: 'e7f0014b' })
    @IsString()
    @IsNotEmpty({ message: '邀请码不能为空' })
    @Length(6, 32, { message: '邀请码长度应为6-32个字符' })
    inviteCode!: string;

    @ApiProperty({ description: '被邀请人用户ID' })
    @IsString()
    @IsNotEmpty({ message: '用户ID不能为空' })
    userId!: string;
}

export class GetInviteCodeDto {
    @ApiProperty({ description: '用户ID' })
    @IsString()
    @IsNotEmpty({ message: '用户ID不能为空' })
    userId!: string;
}

export class InviteRecordResponseDto {
    @ApiProperty({ description: '被邀请人ID' })
    inviteeId!: string;

    @ApiPropertyOptional({ description: '被邀请人昵称' })
    inviteeNickname?: string;

    @ApiProperty({ description: '是否已消费' })
    consumed!: boolean;

    @ApiProperty({ description: '是否已发放奖励' })
    rewarded!: boolean;

    @ApiProperty({ description: '邀请时间' })
    createdAt!: Date;
}
