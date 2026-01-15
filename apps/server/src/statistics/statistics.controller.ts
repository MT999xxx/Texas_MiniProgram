import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
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

    @Get('revenue-trend')
    @ApiOperation({ summary: '获取营收趋势数据' })
    @ApiQuery({ name: 'range', enum: ['7d', '1m', '6m'], required: false })
    getRevenueTrend(@Query('range') range: '7d' | '1m' | '6m' = '7d') {
        return this.statisticsService.getRevenueTrend(range);
    }

    @Get('hot-menu')
    @ApiOperation({ summary: '获取热门菜品 TOP5' })
    getHotMenuItems() {
        return this.statisticsService.getHotMenuItems();
    }

    @Get('leaderboard')
    @ApiOperation({ summary: '获取积分排行榜' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getLeaderboard(@Query('limit') limit: number = 10) {
        return this.statisticsService.getLeaderboard(limit);
    }
}
