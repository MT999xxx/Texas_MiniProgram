import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';

@ApiTags('Membership')
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post('levels')
  @ApiCreatedResponse({ description: '创建会员等级成功' })
  @ApiBadRequestResponse({ description: '等级参数错误' })
  createLevel(@Body() dto: CreateLevelDto) {
    return this.membershipService.createLevel(dto);
  }

  @Get('levels')
  @ApiOkResponse({ description: '会员等级列表' })
  listLevels() {
    return this.membershipService.listLevels();
  }

  @Post('members')
  @ApiCreatedResponse({ description: '创建会员成功' })
  @ApiBadRequestResponse({ description: '等级不存在或参数错误' })
  createMember(@Body() dto: CreateMemberDto) {
    return this.membershipService.createMember(dto);
  }

  @Get('members')
  @ApiOkResponse({ description: '会员列表' })
  listMembers(@Query('levelCode') levelCode?: string) {
    return this.membershipService.listMembers(levelCode);
  }

  @Get('members/current')
  @ApiOkResponse({ description: '获取当前会员信息' })
  async getCurrentMember(@Query('userId') userId?: string) {
    // 在实际应用中，userId应该从JWT token或session中获取
    // 这里为了演示，允许通过query参数传递
    // 如果没有userId，返回一个默认的测试用户
    if (!userId) {
      const members = await this.membershipService.listMembers();
      if (members.length > 0) {
        return members[0];
      }
      return {
        id: 'test-user-001',
        userId: 'test-user-001',
        nickname: '德州爱好者6228',
        phone: '138****8000',
        points: 1280,
        level: {
          level: 1,
          name: '普通会员',
          minPoints: 0,
          nextLevelPoints: 500
        },
        currentExp: 0,
        nextLevelExp: 500
      };
    }

    const member = await this.membershipService.findMemberById(userId);
    if (!member) {
      return {
        id: userId,
        userId,
        nickname: '新用户',
        phone: '',
        points: 0,
        level: {
          level: 1,
          name: '普通会员',
          minPoints: 0,
          nextLevelPoints: 500
        }
      };
    }

    return member;
  }

  @Patch('members/:id/points')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '积分调整成功' })
  @ApiBadRequestResponse({ description: '会员不存在' })
  adjustPoints(@Param('id') id: string, @Body() dto: AdjustPointsDto) {
    return this.membershipService.adjustPoints(id, dto.delta);
  }
}
