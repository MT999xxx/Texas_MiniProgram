import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { ChampionType } from './champion-ranking.entity';

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) { }

  @Post('seed')
  @ApiOperation({ summary: '创建测试排行榜数据' })
  @ApiOkResponse({ description: '创建成功' })
  async seedLeaderboard() {
    return this.loyaltyService.seedTestData();
  }

  @Get('leaderboard')
  @ApiOkResponse({ description: '排行榜数据' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getLeaderboard(
    @Query('type') type: string = 'total',
    @Query('limit') limit?: number,
  ) {
    const rankings = await this.loyaltyService.getLeaderboard(type, limit);
    return { rankings };
  }

  @Get('leaderboard/:memberId')
  @ApiOkResponse({ description: '用户排行榜排名' })
  @ApiQuery({ name: 'type', required: false })
  async getUserRank(
    @Param('memberId') memberId: string,
    @Query('type') type: string = 'total',
  ) {
    const userRank = await this.loyaltyService.getUserRank(memberId, type);
    return { currentUserRank: userRank };
  }

  @Get('leaderboard-with-user/:memberId')
  @ApiOkResponse({ description: '排行榜数据和用户排名' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getLeaderboardWithUser(
    @Param('memberId') memberId: string,
    @Query('type') type: string = 'total',
    @Query('limit') limit?: number,
  ) {
    const [rankings, currentUserRank] = await Promise.all([
      this.loyaltyService.getLeaderboard(type, limit),
      this.loyaltyService.getUserRank(memberId, type)
    ]);

    return { rankings, currentUserRank };
  }

  // ========== 冠军赛排名管理接口 ==========

  @Get('champion')
  @ApiOperation({ summary: '获取冠军赛排名' })
  @ApiQuery({ name: 'type', enum: ['champion_weekly', 'champion_monthly'] })
  async getChampionRankings(@Query('type') type: ChampionType) {
    const rankings = await this.loyaltyService.getChampionLeaderboard(type);
    return { rankings };
  }

  @Post('champion')
  @ApiOperation({ summary: '批量保存冠军赛排名' })
  async saveChampionRankings(
    @Body('type') type: ChampionType,
    @Body('entries') entries: { memberId: string; rank: number }[],
  ) {
    await this.loyaltyService.saveChampionRankings(type, entries);
    return { message: '保存成功' };
  }

  @Delete('champion')
  @ApiOperation({ summary: '移除冠军赛排名条目' })
  async removeChampionEntry(
    @Body('type') type: ChampionType,
    @Body('memberId') memberId: string,
  ) {
    await this.loyaltyService.removeChampionEntry(type, memberId);
    return { message: '删除成功' };
  }
}