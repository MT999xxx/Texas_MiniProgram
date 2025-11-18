import { Controller, Post, Get, Body, Param, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, CreateRechargeDto, PaymentCallbackDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建订单支付' })
  @ApiResponse({ status: 201, description: '支付创建成功' })
  async createOrderPayment(
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createOrderPayment(orderId, dto);
  }

  @Post('recharge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建充值支付' })
  @ApiResponse({ status: 201, description: '充值支付创建成功' })
  async createRechargePayment(@Body() dto: CreateRechargeDto) {
    return this.paymentService.createRechargePayment(dto);
  }

  @Post('wechat-callback')
  @ApiOperation({ summary: '微信支付回调' })
  @ApiHeader({ name: 'Wechatpay-Signature', description: '微信支付签名' })
  @ApiHeader({ name: 'Wechatpay-Timestamp', description: '微信支付时间戳' })
  @ApiHeader({ name: 'Wechatpay-Nonce', description: '微信支付随机串' })
  async handleWechatPayCallback(
    @Headers('Wechatpay-Signature') signature: string,
    @Headers('Wechatpay-Timestamp') timestamp: string,
    @Headers('Wechatpay-Nonce') nonce: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    try {
      const callbackData: PaymentCallbackDto = {
        signature,
        timestamp,
        nonce,
        body: JSON.stringify(body),
        resource: body.resource,
      };

      const result = await this.paymentService.handleWechatPayCallback(callbackData);

      // 微信支付要求返回特定格式的响应
      return {
        code: 'SUCCESS',
        message: '成功'
      };
    } catch (error) {
      console.error('微信支付回调处理失败:', error);

      // 即使处理失败，也要返回成功，避免微信重复回调
      // 具体的错误处理在service层进行
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

  @Get('recharge-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取充值记录' })
  @ApiResponse({ status: 200, description: '充值记录列表' })
  async getRechargeHistory(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const memberId = req.user.id;
    return this.paymentService.getRechargeHistory(
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