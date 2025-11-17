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

  @Patch('members/:id/points')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '积分调整成功' })
  @ApiBadRequestResponse({ description: '会员不存在' })
  adjustPoints(@Param('id') id: string, @Body() dto: AdjustPointsDto) {
    return this.membershipService.adjustPoints(id, dto.delta);
  }
}
