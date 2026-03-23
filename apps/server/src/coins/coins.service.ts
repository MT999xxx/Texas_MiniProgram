import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CoinTransactionEntity, CoinTransactionType, CoinTransactionStatus } from './coin-transaction.entity';
import { PointDepositEntity, PointDepositStatus } from './point-deposit.entity';
import { CheckInEntity } from './check-in.entity';
import { MemberEntity } from '../membership/member.entity';
import { RechargeCoinsDto, ExchangeCoinsDto, DepositPointsDto, WithdrawPointsDto, ReviewDepositDto } from './dto/coins.dto';
import { WechatPayService } from './wechat-pay.service';

// 积分兑换金币的汇率：200积分 = 1金币
const POINTS_PER_COIN = 200;

@Injectable()
export class CoinsService {
    constructor(
        @InjectRepository(CoinTransactionEntity)
        private readonly transactionRepo: Repository<CoinTransactionEntity>,
        @InjectRepository(PointDepositEntity)
        private readonly depositRepo: Repository<PointDepositEntity>,
        @InjectRepository(CheckInEntity)
        private readonly checkInRepo: Repository<CheckInEntity>,
        @InjectRepository(MemberEntity)
        private readonly memberRepo: Repository<MemberEntity>,
        private readonly wechatPayService: WechatPayService,
    ) { }

    /**
     * 获取会员信息（包含金币余额和等级信息）
     */
    async getMemberBalance(memberId: string) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId },
            relations: ['level']
        });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }
        return {
            coins: member.coins,
            points: member.points,
            lotteryChances: member.lotteryChances,
            wineVouchers: member.wineVouchers ?? 0,
            levelCode: member.levelCode || 'V1',
            levelName: member.level?.name || '尊荣白银',
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

        // 按单次充值金额一次性赠送积分（非累计，必须单次达到对应档位）
        const bonusPoints = this.calcRechargeBonusPoints(transaction.amount);
        if (bonusPoints > 0) {
            await this.memberRepo.increment({ id: transaction.memberId }, 'points', bonusPoints);
        }

        return { success: true, message: '充值成功', bonusPoints };
    }

    /**
     * 阶梯积分赠送规则（单次充值，非累计）
     * ¥500  → 赠10000积分
     * ¥1000 → 赠24000积分
     * ¥3000 → 赠80000积分
     * ¥8000 → 赠200000积分
     */
    private calcRechargeBonusPoints(amount: number): number {
        if (amount >= 8000) return 200000;
        if (amount >= 3000) return 80000;
        if (amount >= 1000) return 24000;
        if (amount >= 500)  return 10000;
        return 0;
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
     * 提交存积分申请（存多少就是多少，1:1）
     */
    async createDepositRequest(memberId: string, dto: DepositPointsDto) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }

        // 简化逻辑：存多少就是多少
        const actualPoints = dto.points;

        const deposit = this.depositRepo.create({
            memberId,
            points: dto.points,
            actualPoints,
            lotteryChances: 0,
            status: PointDepositStatus.PENDING,
        });

        const saved = await this.depositRepo.save(deposit);

        return {
            id: saved.id,
            points: dto.points,
            actualPoints,
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

        // 创建取积分记录
        const transaction = this.transactionRepo.create({
            memberId,
            type: CoinTransactionType.WITHDRAW,
            amount: 0,
            pointsUsed: dto.points,
            status: CoinTransactionStatus.SUCCESS,
            remark: `取出${dto.points}积分`,
        });
        await this.transactionRepo.save(transaction);

        // 扣减积分
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

        // 如果审核通过，增加会员积分
        if (dto.status === 'APPROVED') {
            const member = deposit.member;
            member.points += deposit.actualPoints || 0;
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
     * 获取所有交易记录（管理员）
     */
    async getAllTransactions(type?: string) {
        const where = type ? { type: type as any } : {};
        return this.transactionRepo.find({
            where,
            relations: ['member'],
            order: { createdAt: 'DESC' },
            take: 500, // 限制数量避免性能问题
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

    // ========== 签到功能 ==========

    /**
     * 签到积分规则：220 + (连续天数-1) * 110
     * 第1天220分，第7天880分，之后循环
     */
    private calculateCheckInPoints(consecutiveDays: number): number {
        const day = ((consecutiveDays - 1) % 7) + 1; // 7天一个周期
        return 220 + (day - 1) * 110;
    }

    /**
     * 获取签到状态
     */
    async getCheckInStatus(memberId: string) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // 查询今日是否已签到
        const todayRecord = await this.checkInRepo.findOne({
            where: { memberId, checkInDate: today },
        });

        // 查询昨日签到记录（用于判断连续天数）
        const yesterdayRecord = await this.checkInRepo.findOne({
            where: { memberId, checkInDate: yesterday },
        });

        const consecutiveDays = yesterdayRecord ? yesterdayRecord.consecutiveDays : 0;
        const nextDay = todayRecord ? consecutiveDays : consecutiveDays + 1;

        return {
            checkedInToday: !!todayRecord,
            consecutiveDays: todayRecord ? todayRecord.consecutiveDays : nextDay,
            todayPoints: todayRecord?.pointsEarned || this.calculateCheckInPoints(nextDay),
            rewards: Array.from({ length: 7 }, (_, i) => ({
                day: i + 1,
                points: this.calculateCheckInPoints(i + 1),
                isToday: (nextDay - 1) % 7 === i,
                isClaimed: todayRecord && (todayRecord.consecutiveDays - 1) % 7 >= i,
            })),
        };
    }

    /**
     * 执行签到
     */
    async performCheckIn(memberId: string) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member) {
            throw new NotFoundException('会员不存在');
        }

        const today = new Date().toISOString().split('T')[0];

        // 检查今日是否已签到
        const existing = await this.checkInRepo.findOne({
            where: { memberId, checkInDate: today },
        });
        if (existing) {
            throw new BadRequestException('今日已签到');
        }

        // 查询昨日签到记录
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const yesterdayRecord = await this.checkInRepo.findOne({
            where: { memberId, checkInDate: yesterday },
        });

        // 计算连续天数（断签则重置为1）
        const consecutiveDays = yesterdayRecord ? yesterdayRecord.consecutiveDays + 1 : 1;
        const pointsEarned = this.calculateCheckInPoints(consecutiveDays);

        // 创建签到记录
        const checkIn = this.checkInRepo.create({
            memberId,
            checkInDate: today,
            consecutiveDays,
            pointsEarned,
        });
        await this.checkInRepo.save(checkIn);

        // 增加积分
        member.points += pointsEarned;
        await this.memberRepo.save(member);

        return {
            success: true,
            pointsEarned,
            consecutiveDays,
            totalPoints: member.points,
        };
    }
}
