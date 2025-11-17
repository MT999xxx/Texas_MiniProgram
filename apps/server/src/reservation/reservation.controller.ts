import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/create-reservation.dto';
import { ReservationStatus } from './reservation.entity';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @ApiCreatedResponse({ description: '创建预约成功' })
  @ApiBadRequestResponse({ description: '桌位不存在或不可预约' })
  create(@Body() dto: CreateReservationDto) {
    return this.reservationService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: '预约列表' })
  list(@Query('status') status?: ReservationStatus, @Query('tableId') tableId?: string) {
    return this.reservationService.list({ status, tableId });
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新预约状态成功' })
  @ApiBadRequestResponse({ description: '预约不存在或状态非法' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    return this.reservationService.updateStatus(id, dto.status);
  }
}
