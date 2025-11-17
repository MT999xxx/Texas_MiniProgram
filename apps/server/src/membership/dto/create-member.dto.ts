import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMemberDto {
  @ApiProperty({ description: '微信OpenID/用户ID', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  userId!: string;

  @ApiProperty({ description: '手机号', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({ description: '昵称', maxLength: 48 })
  @IsString()
  @IsOptional()
  @MaxLength(48)
  nickname?: string;

  @ApiPropertyOptional({ description: '会员等级编码', maxLength: 24 })
  @IsString()
  @IsOptional()
  @MaxLength(24)
  levelCode?: string;

  @ApiPropertyOptional({ description: '初始积分', default: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number = 0;
}
