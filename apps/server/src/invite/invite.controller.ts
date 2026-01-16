import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiBadRequestResponse } from '@nestjs/swagger';
import { InviteService } from './invite.service';
import { BindInviteCodeDto } from './dto/invite.dto';

@ApiTags('Invite')
@Controller('invite')
export class InviteController {
    constructor(private readonly inviteService: InviteService) { }

    /**
     * 获取用户的邀请码
     */
    @Get('code')
    @ApiOkResponse({ description: '获取邀请码成功' })
    async getInviteCode(@Query('userId') userId: string) {
        if (!userId) {
            return { success: false, message: '用户ID不能为空' };
        }
        const code = await this.inviteService.getOrCreateInviteCode(userId);
        return { success: true, inviteCode: code };
    }

    /**
     * 绑定邀请码
     */
    @Post('bind')
    @ApiOkResponse({ description: '绑定邀请码成功' })
    @ApiBadRequestResponse({ description: '邀请码无效或已绑定' })
    async bindInviteCode(@Body() dto: BindInviteCodeDto) {
        return this.inviteService.bindInviteCode(dto.inviteCode, dto.userId);
    }

    /**
     * 获取已邀请用户列表
     */
    @Get('list')
    @ApiOkResponse({ description: '获取邀请列表成功' })
    async getInvitedUsers(@Query('userId') userId: string) {
        if (!userId) {
            return { success: false, message: '用户ID不能为空', data: [] };
        }
        const invites = await this.inviteService.getInvitedUsers(userId);

        // 格式化返回数据
        const list = invites.map(invite => ({
            inviteeId: invite.inviteeId,
            inviteeNickname: '好友', // 不再关联查询，显示默认值
            consumed: invite.inviteeConsumed,
            rewarded: invite.inviterRewarded,
            createdAt: invite.createdAt,
        }));

        return { success: true, data: list };
    }

    /**
     * 获取邀请统计
     */
    @Get('stats')
    @ApiOkResponse({ description: '获取邀请统计成功' })
    async getInviteStats(@Query('userId') userId: string) {
        if (!userId) {
            return { success: false, message: '用户ID不能为空' };
        }
        const stats = await this.inviteService.getInviteStats(userId);
        return { success: true, ...stats };
    }
}
