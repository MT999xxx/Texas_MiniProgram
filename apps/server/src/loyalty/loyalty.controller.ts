import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('leaderboard')
  @ApiOkResponse({ description: '排行榜数据' })
  @ApiQuery({ name: 'type', enum: ['total', 'weekly', 'event'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getLeaderboard(
    @Query('type') type: 'total' | 'weekly' | 'event' = 'total',
    @Query('limit') limit?: number,
  ) {
    const rankings = await this.loyaltyService.getLeaderboard(type, limit);
    return { rankings };
  }

  @Get('leaderboard/:memberId')
  @ApiOkResponse({ description: '用户排行榜排名' })
  @ApiQuery({ name: 'type', enum: ['total', 'weekly', 'event'], required: false })
  async getUserRank(
    @Param('memberId') memberId: string,
    @Query('type') type: 'total' | 'weekly' | 'event' = 'total',
  ) {
    const userRank = await this.loyaltyService.getUserRank(memberId, type);
    return { currentUserRank: userRank };
  }

  @Get('leaderboard-with-user/:memberId')
  @ApiOkResponse({ description: '排行榜数据和用户排名' })
  @ApiQuery({ name: 'type', enum: ['total', 'weekly', 'event'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getLeaderboardWithUser(
    @Param('memberId') memberId: string,
    @Query('type') type: 'total' | 'weekly' | 'event' = 'total',
    @Query('limit') limit?: number,
  ) {
    const [rankings, currentUserRank] = await Promise.all([
      this.loyaltyService.getLeaderboard(type, limit),
      this.loyaltyService.getUserRank(memberId, type)
    ]);

    return { rankings, currentUserRank };
  }
}