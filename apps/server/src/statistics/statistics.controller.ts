import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
    constructor(private readonly statisticsService: StatisticsService) { }

    @Get('summary')
    @ApiOperation({ summary: '获取仪表盘统计摘要' })
    @ApiOkResponse({ description: '返回今日预约、会员来访和营收摘要' })
    getSummary() {
        return this.statisticsService.getDashboardSummary();
    }
}
