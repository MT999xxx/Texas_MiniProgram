import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto, CreateReservationWithDepositDto, UpdateReservationStatusDto } from './dto/create-reservation.dto';
import { ReservationStatus } from './reservation.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) { }

  @Post()
  @ApiCreatedResponse({ description: '创建预约成功' })
  @ApiBadRequestResponse({ description: '桌位不存在或不可预约' })
  create(@Body() dto: CreateReservationDto) {
    return this.reservationService.create(dto);
  }

  @Post('with-deposit')
  @ApiCreatedResponse({ description: '创建预约（带订金）成功，返回预约信息和是否需要支付' })
  @ApiBadRequestResponse({ description: '桌位不存在或不可预约' })
  createWithDeposit(@Body() dto: CreateReservationWithDepositDto) {
    return this.reservationService.createWithDeposit(dto);
  }

  @Get()
  @ApiOkResponse({ description: '预约列表' })
  list(
    @Query('status') status?: ReservationStatus,
    @Query('tableId') tableId?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.reservationService.list({ status, tableId, memberId });
  }

  @Get('my-list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: '我的预约列表' })
  getMyReservations(@Req() req: any) {
    const memberId = req.user?.id;
    return this.reservationService.list({ memberId });
  }

  @Get(':id')
  @ApiOkResponse({ description: '预约详情' })
  getById(@Param('id') id: string) {
    return this.reservationService.findById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新预约成功' })
  @ApiBadRequestResponse({ description: '预约不存在' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateReservationDto>) {
    return this.reservationService.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新预约状态成功' })
  @ApiBadRequestResponse({ description: '预约不存在或状态非法' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    return this.reservationService.updateStatus(id, dto.status);
  }

  @Patch(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '确认订金支付成功' })
  confirmPayment(@Param('id') id: string, @Body() body: { paymentId: string }) {
    return this.reservationService.confirmDepositPayment(id, body.paymentId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '取消预约成功' })
  @ApiBadRequestResponse({ description: '预约不存在或无法取消' })
  cancel(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.reservationService.cancelReservation(id, body?.reason);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: '删除预约成功' })
  @ApiBadRequestResponse({ description: '预约不存在' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.reservationService.delete(id);
  }
}
