import { Controller, Post, Get, Body, Param, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentCallbackDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建订单支付' })
  @ApiResponse({ status: 201, description: '支付创建成功' })
  async createOrderPayment(
    @Param('orderId') orderId: string,
    @Body() body: { openid?: string },
    @Req() req: any,
  ) {
    const memberId = req.user.id;
    return this.paymentService.createOrderPayment(orderId, memberId, body.openid);
  }

  @Post('reservation/:reservationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建预约订金支付' })
  @ApiResponse({ status: 201, description: '预约支付创建成功' })
  async createReservationPayment(
    @Param('reservationId') reservationId: string,
    @Body() body: { depositAmount: number; openid?: string },
    @Req() req: any,
  ) {
    const memberId = req.user.id;
    return this.paymentService.createReservationPayment(
      reservationId,
      body.depositAmount,
      memberId,
      body.openid,
    );
  }

  @Post('recharge/:packageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建充值支付' })
  @ApiResponse({ status: 201, description: '充值支付创建成功' })
  async createRechargePayment(
    @Param('packageId') packageId: string,
    @Body() body: { openid?: string },
    @Req() req: any,
  ) {
    const memberId = req.user.id;
    return this.paymentService.createRechargePayment(packageId, memberId, body.openid);
  }

  @Post('coin-recharge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建金币充值支付' })
  @ApiResponse({ status: 201, description: '金币充值支付创建成功' })
  async createCoinRechargePayment(
    @Body() body: { amount: number; openid?: string },
    @Req() req: any,
  ) {
    const memberId = req.user.id;
    return this.paymentService.createCoinRechargePayment(body.amount, memberId, body.openid);
  }

  @Post('wechat-callback')
  @ApiOperation({ summary: '微信支付回调' })
  @ApiHeader({ name: 'Wechatpay-Signature', description: '微信支付签名' })
  @ApiHeader({ name: 'Wechatpay-Timestamp', description: '微信支付时间戳' })
  @ApiHeader({ name: 'Wechatpay-Nonce', description: '微信支付随机串' })
  async handleWechatPayCallback(@Body() body: any) {
    try {
      const callbackData = body.resource
        ? this.paymentService.decryptWechatPayCallback(body.resource)
        : body;
      if (callbackData.trade_state && callbackData.trade_state !== 'SUCCESS') {
        return { code: 'SUCCESS', message: '非支付成功通知，无需入账' };
      }

      const paymentOrderNo = callbackData.out_trade_no;
      const transactionId = callbackData.transaction_id;
      if (!paymentOrderNo || !transactionId) {
        throw new Error('微信支付回调缺少订单号或交易号');
      }

      await this.paymentService.handleWechatPayCallback(paymentOrderNo, transactionId);

      return {
        code: 'SUCCESS',
        message: '成功'
      };
    } catch (error: any) {
      console.error('微信支付回调处理失败:', error);
      return {
        code: 'FAIL',
        message: error.message || '处理失败'
      };
    }
  }

  @Get('status/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询支付状态' })
  @ApiResponse({ status: 200, description: '支付状态查询成功' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentStatus(paymentId);
  }

  @Get('packages')
  @ApiOperation({ summary: '获取充值套餐列表' })
  @ApiResponse({ status: 200, description: '充值套餐列表' })
  async getRechargePackages() {
    return this.paymentService.getRechargePackages();
  }

  @Get('order-by-trade-no/:tradeNo')
  @ApiOperation({ summary: '通过支付订单号查询订单（微信订单中心用）' })
  @ApiResponse({ status: 200, description: '订单查询成功' })
  async getOrderByTradeNo(@Param('tradeNo') tradeNo: string) {
    return this.paymentService.getOrderByTradeNo(tradeNo);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取支付记录' })
  @ApiResponse({ status: 200, description: '支付记录列表' })
  async getPaymentHistory(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const memberId = req.user.id;
    return this.paymentService.getPaymentHistory(
      memberId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('cancel/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消支付' })
  @ApiResponse({ status: 200, description: '支付取消成功' })
  async cancelPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.cancelPayment(paymentId);
  }
}
