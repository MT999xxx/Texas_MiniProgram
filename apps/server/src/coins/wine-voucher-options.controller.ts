import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateWineVoucherOptionDto,
  RedeemWineVoucherDto,
  UpdateWineVoucherOptionDto,
} from './dto/wine-voucher-option.dto';
import { WineVoucherOptionsService } from './wine-voucher-options.service';

@ApiTags('WineVoucherOptions')
@Controller('wine-voucher-options')
export class WineVoucherOptionsController {
  constructor(private readonly wineVoucherOptionsService: WineVoucherOptionsService) {}

  @Get()
  @ApiOkResponse({ description: '可兑换酒品列表' })
  listActive() {
    return this.wineVoucherOptionsService.listActive();
  }

  @Get('admin')
  @ApiOkResponse({ description: '后台酒券兑换配置列表' })
  listAdmin() {
    return this.wineVoucherOptionsService.listAdmin();
  }

  @Post()
  @ApiCreatedResponse({ description: '创建酒券兑换配置' })
  create(@Body() dto: CreateWineVoucherOptionDto) {
    return this.wineVoucherOptionsService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: '更新酒券兑换配置' })
  update(@Param('id') id: string, @Body() dto: UpdateWineVoucherOptionDto) {
    return this.wineVoucherOptionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: '停用酒券兑换配置' })
  disable(@Param('id') id: string) {
    return this.wineVoucherOptionsService.disable(id);
  }

  @Post(':id/redeem')
  @ApiOkResponse({ description: '兑换酒券并创建订单' })
  redeem(@Param('id') id: string, @Body() dto: RedeemWineVoucherDto) {
    return this.wineVoucherOptionsService.redeem(id, dto);
  }
}

