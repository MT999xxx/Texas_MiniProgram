import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinTransactionEntity, CoinTransactionType, CoinTransactionStatus } from './coin-transaction.entity';
import { PointDepositEntity, PointDepositStatus } from './point-deposit.entity';
import { MemberEntity } from '../membership/member.entity';
import { RechargeCoinsDto, ExchangeCoinsDto, DepositPointsDto, WithdrawPointsDto, ReviewDepositDto } from './dto/coins.dto';
import { WechatPayService } from './wechat-pay.service';

// 积分兑换金币的汇率：20积分 = 1金币
const POINTS_PER_COIN = 20;
// 存积分的阈值：5000以内1:1，超出部分1000:1抽奖
const DEPOSIT_THRESHOLD = 5000;
const POINTS_PER_LOTTERY = 1000;

@Injectable()
export class CoinsService {
    constructor(
        @InjectRepository(CoinTransactionEntity)
        private readonly transactionRepo: Repository<CoinTransactionEntity>,
        @InjectRepository(PointDepositEntity)
        private readonly depositRepo: Repository<PointDepositEntity>,
        @InjectRepository(MemberEntity)
        private readonly memberRepo: Repository<MemberEntity>,
        private readonly wechatPayService: WechatPayService,
    ) { }

    /**
     * 获取会员信息（包含金币余额）
     */
    async getMemberBalance(memberId: string) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }
        return {
            coins: member.coins,
            points: member.points,
            lotteryChances: member.lotteryChances,
        };
    }

    /**
     * 充值金币（创建待支付订单）
     */
    async createRechargeOrder(memberId: string, dto: RechargeCoinsDto & { openId?: string }) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }

        const outTradeNo = this.wechatPayService.generateOutTradeNo();

        // 创建充值交易记录
        const transaction = this.transactionRepo.create({
            memberId,
            type: CoinTransactionType.RECHARGE,
            amount: dto.amount, // 充值金额 = 金币数量（1:1）
            paymentAmount: dto.amount,
            transactionId: outTradeNo,
            status: CoinTransactionStatus.PENDING,
        });

        const saved = await this.transactionRepo.save(transaction);

        // 调用微信支付
        const openId = dto.openId || member.userId; // 使用会员的openId
        const payResult = await this.wechatPayService.createOrder({
            outTradeNo,
            totalAmount: dto.amount,
            description: `三条A充值${dto.amount}金币`,
            openId,
        });

        if (!payResult.success) {
            throw new BadRequestException(payResult.error || '创建支付订单失败');
        }

        return {
            orderId: saved.id,
            outTradeNo,
            amount: dto.amount,
            paymentParams: payResult.paymentParams,
        };
    }

    /**
     * 充值成功回调（模拟）
     */
    async confirmRecharge(orderId: string) {
        const transaction = await this.transactionRepo.findOne({ where: { id: orderId } });
        if (!transaction) {
            throw new NotFoundException('订单不存在');
        }

        if (transaction.status === CoinTransactionStatus.SUCCESS) {
            return { success: true, message: '订单已处理' };
        }

        // 更新交易状态
        transaction.status = CoinTransactionStatus.SUCCESS;
        await this.transactionRepo.save(transaction);

        // 增加金币余额
        await this.memberRepo.increment({ id: transaction.memberId }, 'coins', transaction.amount);

        return { success: true, message: '充值成功' };
    }

    /**
     * 积分兑换金币
     */
    async exchangePointsToCoins(memberId: string, dto: ExchangeCoinsDto) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }

        const pointsNeeded = dto.coins * POINTS_PER_COIN;
        if (member.points < pointsNeeded) {
            throw new BadRequestException(`积分不足，需要 ${pointsNeeded} 积分，当前只有 ${member.points} 积分`);
        }

        // 创建兑换记录
        const transaction = this.transactionRepo.create({
            memberId,
            type: CoinTransactionType.EXCHANGE,
            amount: dto.coins,
            pointsUsed: pointsNeeded,
            status: CoinTransactionStatus.SUCCESS,
            remark: `${pointsNeeded}积分兑换${dto.coins}金币`,
        });
        await this.transactionRepo.save(transaction);

        // 扣减积分，增加金币
        member.points -= pointsNeeded;
        member.coins = Number(member.coins) + dto.coins;
        await this.memberRepo.save(member);

        return {
            success: true,
            message: `成功兑换 ${dto.coins} 金币`,
            pointsUsed: pointsNeeded,
            currentCoins: member.coins,
            currentPoints: member.points,
        };
    }

    /**
     * 提交存积分申请
     */
    async createDepositRequest(memberId: string, dto: DepositPointsDto) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }

        // 计算实际存入积分和抽奖次数
        let actualPoints = Math.min(dto.points, DEPOSIT_THRESHOLD);
        let lotteryChances = 0;
        if (dto.points > DEPOSIT_THRESHOLD) {
            const excessPoints = dto.points - DEPOSIT_THRESHOLD;
            lotteryChances = Math.floor(excessPoints / POINTS_PER_LOTTERY);
        }

        const deposit = this.depositRepo.create({
            memberId,
            points: dto.points,
            actualPoints,
            lotteryChances,
            status: PointDepositStatus.PENDING,
        });

        const saved = await this.depositRepo.save(deposit);

        return {
            id: saved.id,
            points: dto.points,
            actualPoints,
            lotteryChances,
            message: '存积分申请已提交，请等待审核',
        };
    }

    /**
     * 取积分（直接取出）
     */
    async withdrawPoints(memberId: string, dto: WithdrawPointsDto) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }

        if (member.points < dto.points) {
            throw new BadRequestException(`积分不足，当前只有 ${member.points} 积分`);
        }

        // 直接扣减积分
        member.points -= dto.points;
        await this.memberRepo.save(member);

        return {
            success: true,
            message: `成功取出 ${dto.points} 积分`,
            currentPoints: member.points,
        };
    }

    /**
     * 获取存积分申请列表（管理员）
     */
    async getDepositRequests(status?: PointDepositStatus) {
        const where = status ? { status } : {};
        return this.depositRepo.find({
            where,
            relations: ['member'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 审核存积分申请（管理员）
     */
    async reviewDeposit(depositId: string, dto: ReviewDepositDto, reviewerId: string) {
        const deposit = await this.depositRepo.findOne({
            where: { id: depositId },
            relations: ['member'],
        });

        if (!deposit) {
            throw new NotFoundException('申请不存在');
        }

        if (deposit.status !== PointDepositStatus.PENDING) {
            throw new BadRequestException('该申请已处理');
        }

        deposit.status = dto.status as PointDepositStatus;
        deposit.reviewedBy = reviewerId;
        deposit.reviewedAt = new Date();
        deposit.reviewRemark = dto.remark;

        await this.depositRepo.save(deposit);

        // 如果审核通过，增加会员积分和抽奖次数
        if (dto.status === 'APPROVED') {
            const member = deposit.member;
            member.points += deposit.actualPoints || 0;
            member.lotteryChances += deposit.lotteryChances || 0;
            await this.memberRepo.save(member);
        }

        return {
            success: true,
            message: dto.status === 'APPROVED' ? '审核通过' : '审核拒绝',
        };
    }

    /**
     * 获取交易记录
     */
    async getTransactions(memberId: string) {
        return this.transactionRepo.find({
            where: { memberId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 获取用户的存积分申请记录
     */
    async getMemberDeposits(memberId: string) {
        return this.depositRepo.find({
            where: { memberId },
            order: { createdAt: 'DESC' },
        });
    }
}
