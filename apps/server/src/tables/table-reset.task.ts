import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TableService } from './table.service';
import { ReservationService } from '../reservation/reservation.service';

/**
 * 桌位自动重置定时任务
 * 每天凌晨0点执行，将所有桌位重置为可用状态，并取消过期预约
 */
@Injectable()
export class TableResetTask {
    private readonly logger = new Logger(TableResetTask.name);

    constructor(
        private readonly tableService: TableService,
        private readonly reservationService: ReservationService,
    ) { }

    @Cron('0 0 * * *', { timeZone: 'Asia/Shanghai' })
    async handleMidnightReset() {
        this.logger.log('开始执行凌晨桌位重置任务...');

        try {
            // 1. 取消过期预约
            const reservationResult = await this.reservationService.cancelExpiredReservations();
            this.logger.log(`已取消 ${reservationResult.count} 条过期预约`);

            // 2. 重置桌位状态
            const tableResult = await this.tableService.resetAllTables();
            this.logger.log(`已重置 ${tableResult.count} 个桌位状态`);

            this.logger.log('凌晨桌位重置任务执行完成');
        } catch (error) {
            this.logger.error('凌晨桌位重置任务执行失败', error);
        }
    }
}
