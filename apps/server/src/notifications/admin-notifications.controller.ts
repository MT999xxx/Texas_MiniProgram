import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminNotificationsService } from './admin-notifications.service';

@ApiTags('AdminNotifications')
@Controller('admin-notifications')
export class AdminNotificationsController {
  constructor(private readonly adminNotificationsService: AdminNotificationsService) {}

  @Get()
  @ApiOkResponse({ description: '后台通知列表' })
  list(
    @Query('status') status?: 'all' | 'unread',
    @Query('limit') limit?: string,
  ) {
    return this.adminNotificationsService.list(status || 'all', Number(limit || 50));
  }

  @Patch(':id/read')
  @ApiOkResponse({ description: '标记通知已读' })
  markRead(@Param('id') id: string) {
    return this.adminNotificationsService.markRead(id);
  }

  @Patch('read-all')
  @ApiOkResponse({ description: '全部标记已读' })
  markAllRead() {
    return this.adminNotificationsService.markAllRead();
  }
}

