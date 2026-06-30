import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminNotificationEntity } from './admin-notification.entity';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminNotificationEntity])],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
  exports: [AdminNotificationsService],
})
export class AdminNotificationsModule {}

