import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiCreatedResponse({ description: '创建订单成功' })
  @ApiBadRequestResponse({ description: '菜单/预约/桌位/库存问题' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: '订单列表' })
  list() {
    return this.ordersService.list();
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '状态更新成功' })
  @ApiBadRequestResponse({ description: '订单不存在或状态非法' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
