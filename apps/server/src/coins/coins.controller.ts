import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoinsService } from './coins.service';
import { RechargeCoinsDto, ExchangeCoinsDto, DepositPointsDto, WithdrawPointsDto, ReviewDepositDto } from './dto/coins.dto';
import { PointDepositStatus } from './point-deposit.entity';

@ApiTags('金币与积分')
@Controller('coins')
export class CoinsController {
    constructor(private readonly coinsService: CoinsService) { }

    @Get('balance/:memberId')
    @ApiOperation({ summary: '获取余额' })
    getBalance(@Param('memberId') memberId: string) {
        return this.coinsService.getMemberBalance(memberId);
    }

    @Post('recharge')
    @ApiOperation({ summary: '发起充值' })
    @ApiBearerAuth()
    createRecharge(@Body() dto: RechargeCoinsDto, @Request() req: any) {
        const memberId = req.user?.memberId || req.body.memberId;
        return this.coinsService.createRechargeOrder(memberId, dto);
    }

    @Post('recharge/confirm/:orderId')
    @ApiOperation({ summary: '确认充值成功（模拟回调）' })
    confirmRecharge(@Param('orderId') orderId: string) {
        return this.coinsService.confirmRecharge(orderId);
    }

    @Post('exchange')
    @ApiOperation({ summary: '积分兑换金币' })
    @ApiBearerAuth()
    exchange(@Body() dto: ExchangeCoinsDto & { memberId: string }) {
        return this.coinsService.exchangePointsToCoins(dto.memberId, dto);
    }

    @Get('transactions/:memberId')
    @ApiOperation({ summary: '获取交易记录' })
    getTransactions(@Param('memberId') memberId: string) {
        return this.coinsService.getTransactions(memberId);
    }

    // ===== 存取积分 =====

    @Post('points/deposit')
    @ApiOperation({ summary: '提交存积分申请' })
    createDeposit(@Body() dto: DepositPointsDto & { memberId: string }) {
        return this.coinsService.createDepositRequest(dto.memberId, dto);
    }

    @Post('points/withdraw')
    @ApiOperation({ summary: '取积分' })
    withdraw(@Body() dto: WithdrawPointsDto & { memberId: string }) {
        return this.coinsService.withdrawPoints(dto.memberId, dto);
    }

    @Get('points/deposits')
    @ApiOperation({ summary: '获取存积分申请列表（管理员）' })
    getDeposits(@Query('status') status?: PointDepositStatus) {
        return this.coinsService.getDepositRequests(status);
    }

    @Get('points/deposits/:memberId')
    @ApiOperation({ summary: '获取用户存积分记录' })
    getMemberDeposits(@Param('memberId') memberId: string) {
        return this.coinsService.getMemberDeposits(memberId);
    }

    @Patch('points/deposits/:id/review')
    @ApiOperation({ summary: '审核存积分申请' })
    reviewDeposit(
        @Param('id') id: string,
        @Body() dto: ReviewDepositDto,
        @Request() req: any,
    ) {
        const reviewerId = req.user?.id || 'admin';
        return this.coinsService.reviewDeposit(id, dto, reviewerId);
    }
}
