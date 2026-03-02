import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from './order.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiCreatedResponse({ description: '创建订单成功' })
  @ApiBadRequestResponse({ description: '菜单/预约/桌位/库存问题' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: '订单列表' })
  list(
    @Query('status') status?: OrderStatus,
    @Query('memberId') memberId?: string,
    @Query('tableId') tableId?: string,
  ) {
    return this.ordersService.list({ status, memberId, tableId });
  }

  @Get('stats')
  @ApiOkResponse({ description: '订单统计数据' })
  getStats() {
    return this.ordersService.getStats();
  }


  @Get(':id')
  @ApiOkResponse({ description: '订单详情' })
  getById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '状态更新成功' })
  @ApiBadRequestResponse({ description: '订单不存在或状态非法' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Post(':id/pay-with-coins')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '金币支付成功' })
  @ApiBadRequestResponse({ description: '订单不存在、状态非法或金币余额不足' })
  payWithCoins(@Param('id') id: string, @Body('memberId') memberId: string) {
    return this.ordersService.payWithCoins(id, memberId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '退款成功' })
  @ApiBadRequestResponse({ description: '订单不存在或状态不允许退款' })
  refund(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('amount') amount?: number,
  ) {
    return this.ordersService.refund(id, reason, amount);
  }
}
