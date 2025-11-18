import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WxLoginDto {
  @ApiProperty({ description: '微信登录code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: '用户昵称', required: false })
  @IsString()
  nickname?: string;

  @ApiProperty({ description: '头像URL', required: false })
  @IsString()
  avatarUrl?: string;
}