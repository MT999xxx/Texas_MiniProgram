import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, RegisterEventDto } from './dto/create-event.dto';
import { EventStatus, EventType } from './event.entity';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiCreatedResponse({ description: '创建活动成功' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: '活动列表' })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  @ApiQuery({ name: 'type', enum: EventType, required: false })
  findAll(
    @Query('status') status?: EventStatus,
    @Query('type') type?: EventType,
  ) {
    return this.eventsService.findAll(status, type);
  }

  @Get(':id')
  @ApiOkResponse({ description: '活动详情' })
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: '更新活动成功' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: '删除活动成功' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/register')
  @ApiCreatedResponse({ description: '报名成功' })
  register(@Param('id') id: string, @Body() dto: RegisterEventDto) {
    return this.eventsService.register(id, dto);
  }

  @Delete(':id/register/:memberId')
  @ApiOkResponse({ description: '取消报名成功' })
  cancelRegistration(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.eventsService.cancelRegistration(id, memberId);
  }

  @Get('registrations/:memberId')
  @ApiOkResponse({ description: '用户报名的活动列表' })
  getUserRegistrations(@Param('memberId') memberId: string) {
    return this.eventsService.getUserRegistrations(memberId);
  }

  @Post(':id/award-points/:memberId')
  @ApiOkResponse({ description: '奖励积分成功' })
  awardEventPoints(
    @Param('id') eventId: string,
    @Param('memberId') memberId: string,
    @Body() body?: { points?: number },
  ) {
    return this.eventsService.awardEventPoints(eventId, memberId, body?.points);
  }

  @Patch('update-statuses')
  @ApiOkResponse({ description: '更新活动状态成功' })
  updateEventStatuses() {
    return this.eventsService.updateEventStatuses();
  }
}