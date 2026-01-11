import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RechargeCoinsDto {
    @ApiProperty({ description: '充值金额（元）', minimum: 1 })
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    amount!: number;
}

export class ExchangeCoinsDto {
    @ApiProperty({ description: '要兑换的金币数量', minimum: 1 })
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    coins!: number;
}

export class DepositPointsDto {
    @ApiProperty({ description: '要存入的积分数量', minimum: 1 })
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    points!: number;
}

export class WithdrawPointsDto {
    @ApiProperty({ description: '要取出的积分数量', minimum: 1 })
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    points!: number;
}

export class ReviewDepositDto {
    @ApiProperty({ description: '审核结果', enum: ['APPROVED', 'REJECTED'] })
    @IsString()
    status!: 'APPROVED' | 'REJECTED';

    @ApiPropertyOptional({ description: '审核备注' })
    @IsString()
    @IsOptional()
    remark?: string;
}
