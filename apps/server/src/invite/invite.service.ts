import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteEntity } from './invite.entity';
import { MemberEntity } from '../membership/member.entity';
import { randomBytes } from 'crypto';

const INVITE_REWARD_POINTS = 500; // 邀请奖励积分

@Injectable()
export class InviteService {
    constructor(
        @InjectRepository(InviteEntity)
        private readonly inviteRepo: Repository<InviteEntity>,
        @InjectRepository(MemberEntity)
        private readonly memberRepo: Repository<MemberEntity>,
    ) { }

    /**
     * 生成或获取用户的邀请码
     * 邀请码基于用户ID生成，确保唯一性
     */
    async getOrCreateInviteCode(userId: string): Promise<string> {
        // 检查是否已有邀请记录（作为邀请人）
        const existing = await this.inviteRepo.findOne({
            where: { inviterId: userId },
        });

        if (existing) {
            return existing.inviteCode;
        }

        // 生成新的邀请码：取userId前4位 + 随机4位
        const prefix = userId.replace(/-/g, '').slice(0, 4);
        const suffix = randomBytes(2).toString('hex');
        return `${prefix}${suffix}`;
    }

    /**
     * 绑定邀请关系
     * 被邀请人填写邀请码后调用
     */
    async bindInviteCode(inviteCode: string, inviteeId: string): Promise<{ success: boolean; message: string }> {
        // 查找邀请码对应的邀请人
        const inviterRecord = await this.inviteRepo.findOne({
            where: { inviteCode },
        });

        // 如果没有记录，需要通过邀请码反推邀请人
        // 邀请码格式：用户ID前4位 + 随机4位，需要遍历查找
        const members = await this.memberRepo.find();
        let inviterId: string | null = null;

        for (const member of members) {
            const possibleCode = await this.getOrCreateInviteCode(member.userId);
            if (possibleCode === inviteCode) {
                inviterId = member.userId;
                break;
            }
        }

        if (!inviterId) {
            throw new BadRequestException('邀请码无效');
        }

        if (inviterId === inviteeId) {
            throw new BadRequestException('不能使用自己的邀请码');
        }

        // 检查是否已绑定过
        const existingBind = await this.inviteRepo.findOne({
            where: { inviteeId },
        });

        if (existingBind) {
            throw new BadRequestException('您已绑定过邀请码');
        }

        // 创建邀请关系
        const invite = this.inviteRepo.create({
            inviterId,
            inviteeId,
            inviteCode,
            inviterRewarded: false,
            inviteeRewarded: false,
            inviteeConsumed: false,
        });

        await this.inviteRepo.save(invite);

        return { success: true, message: '绑定成功' };
    }

    /**
     * 获取用户邀请的用户列表
     */
    async getInvitedUsers(userId: string): Promise<InviteEntity[]> {
        const invites = await this.inviteRepo.find({
            where: { inviterId: userId },
            relations: ['invitee'],
            order: { createdAt: 'DESC' },
        });

        return invites;
    }

    /**
     * 标记被邀请人已消费，并发放奖励
     * 应在订单完成时调用
     */
    async markConsumedAndReward(inviteeId: string): Promise<void> {
        const invite = await this.inviteRepo.findOne({
            where: { inviteeId, inviteeConsumed: false },
        });

        if (!invite) {
            return; // 没有邀请关系或已消费过
        }

        // 标记已消费
        invite.inviteeConsumed = true;

        // 发放奖励给双方
        if (!invite.inviterRewarded) {
            await this.memberRepo.increment(
                { userId: invite.inviterId },
                'points',
                INVITE_REWARD_POINTS,
            );
            invite.inviterRewarded = true;
        }

        if (!invite.inviteeRewarded) {
            await this.memberRepo.increment(
                { userId: invite.inviteeId },
                'points',
                INVITE_REWARD_POINTS,
            );
            invite.inviteeRewarded = true;
        }

        await this.inviteRepo.save(invite);
    }

    /**
     * 获取邀请统计
     */
    async getInviteStats(userId: string): Promise<{
        totalInvited: number;
        consumedCount: number;
        totalRewardPoints: number;
    }> {
        const invites = await this.inviteRepo.find({
            where: { inviterId: userId },
        });

        const totalInvited = invites.length;
        const consumedCount = invites.filter(i => i.inviteeConsumed).length;
        const totalRewardPoints = consumedCount * INVITE_REWARD_POINTS;

        return { totalInvited, consumedCount, totalRewardPoints };
    }
}
