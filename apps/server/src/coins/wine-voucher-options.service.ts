import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminNotificationsService } from '../notifications/admin-notifications.service';
import { MemberEntity } from '../membership/member.entity';
import { OrdersService } from '../orders/orders.service';
import { WineVoucherBatchEntity } from './wine-voucher-batch.entity';
import { WineVoucherRedeemItemEntity } from './wine-voucher-redeem-item.entity';
import { WineVoucherRedeemOptionEntity } from './wine-voucher-redeem-option.entity';
import { WineVoucherRedemptionEntity } from './wine-voucher-redemption.entity';
import {
  CreateWineVoucherOptionDto,
  RedeemWineVoucherDto,
  UpdateWineVoucherOptionDto,
  WineVoucherRedeemItemDto,
} from './dto/wine-voucher-option.dto';
import { getEffectiveWineVoucherBatchExpiresAt } from './coin-rules';

@Injectable()
export class WineVoucherOptionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WineVoucherRedeemOptionEntity)
    private readonly optionRepo: Repository<WineVoucherRedeemOptionEntity>,
    @InjectRepository(WineVoucherRedeemItemEntity)
    private readonly optionItemRepo: Repository<WineVoucherRedeemItemEntity>,
    private readonly ordersService: OrdersService,
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  listActive() {
    return this.optionRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  listAdmin() {
    return this.optionRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async create(dto: CreateWineVoucherOptionDto) {
    const option = await this.optionRepo.save(this.optionRepo.create({
      name: dto.name,
      description: dto.description,
      voucherPackageId: dto.voucherPackageId,
      requiredVoucherCount: dto.requiredVoucherCount || 1,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder || 0,
    }));

    await this.replaceItems(option.id, dto.items);
    return this.findOption(option.id);
  }

  async update(id: string, dto: UpdateWineVoucherOptionDto) {
    const option = await this.findOption(id);
    if (dto.name !== undefined) option.name = dto.name;
    if (dto.description !== undefined) option.description = dto.description;
    if (dto.voucherPackageId !== undefined) option.voucherPackageId = dto.voucherPackageId;
    if (dto.requiredVoucherCount !== undefined) option.requiredVoucherCount = dto.requiredVoucherCount;
    if (dto.isActive !== undefined) option.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) option.sortOrder = dto.sortOrder;
    await this.optionRepo.save(option);

    if (dto.items) {
      await this.optionItemRepo.delete({ optionId: id });
      await this.replaceItems(id, dto.items);
    }

    return this.findOption(id);
  }

  async disable(id: string) {
    const option = await this.findOption(id);
    option.isActive = false;
    return this.optionRepo.save(option);
  }

  async redeem(optionId: string, dto: RedeemWineVoucherDto) {
    return this.dataSource.transaction(async (manager) => {
      const optionRepo = manager.getRepository(WineVoucherRedeemOptionEntity);
      const batchRepo = manager.getRepository(WineVoucherBatchEntity);
      const memberRepo = manager.getRepository(MemberEntity);
      const redemptionRepo = manager.getRepository(WineVoucherRedemptionEntity);

      const option = await optionRepo.findOne({ where: { id: optionId } });
      if (!option) throw new NotFoundException('兑换项目不存在');
      if (!option.isActive) throw new BadRequestException('该兑换项目已下架');
      if (!option.items || option.items.length === 0) {
        throw new BadRequestException('兑换项目未配置酒品');
      }

      const member = await memberRepo.findOne({ where: { id: dto.memberId } });
      if (!member) throw new NotFoundException('会员不存在');

      const now = new Date();
      const batchWhere = {
        ...(dto.voucherBatchId ? { id: dto.voucherBatchId } : {}),
        memberId: dto.memberId,
        ...(!dto.voucherBatchId && option.voucherPackageId ? { sourceId: option.voucherPackageId } : {}),
      };
      const candidateBatches = await batchRepo.find({
        where: batchWhere,
        order: { expiresAt: 'ASC', createdAt: 'ASC' },
      });
      const batches = candidateBatches.filter(
        (batch) => getEffectiveWineVoucherBatchExpiresAt(batch) >= now,
      );
      const allMemberBatches = !dto.voucherBatchId && option.voucherPackageId
        ? await batchRepo.find({ where: { memberId: dto.memberId } })
        : candidateBatches;

      const requiredCount = Number(option.requiredVoucherCount || 1);
      const batchAvailableCount = batches.reduce((sum, batch) => (
        sum + Math.max(0, Number(batch.remainingQuantity || 0))
      ), 0);
      const canUseLegacyVoucherCount = !dto.voucherBatchId;
      const representedBatchCount = allMemberBatches.reduce((sum, batch) => (
        sum + Math.max(0, Number(batch.remainingQuantity || 0))
      ), 0);
      const legacyVoucherCount = canUseLegacyVoucherCount
        ? Math.max(0, Number(member.wineVouchers || 0) - representedBatchCount)
        : 0;
      const availableCount = canUseLegacyVoucherCount
        ? batchAvailableCount + legacyVoucherCount
        : batchAvailableCount;

      if (availableCount < requiredCount) {
        throw new BadRequestException(`酒券数量不足，需要${requiredCount}张，当前${availableCount}张`);
      }

      let remainingToConsume = requiredCount;
      let firstBatchId: string | undefined;
      for (const batch of batches) {
        if (remainingToConsume <= 0) break;
        const available = Math.max(0, Number(batch.remainingQuantity || 0));
        if (available <= 0) continue;
        const used = Math.min(available, remainingToConsume);
        batch.remainingQuantity = available - used;
        remainingToConsume -= used;
        firstBatchId = firstBatchId || batch.id;
        await batchRepo.save(batch);
      }

      member.wineVouchers = Math.max(0, Number(member.wineVouchers || 0) - requiredCount);
      await memberRepo.save(member);

      const order = await this.ordersService.createWineVoucherRedemptionOrder({
        memberId: dto.memberId,
        tableId: dto.tableId,
        optionName: option.name,
        items: option.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specType: item.specType,
        })),
      }, manager);

      const redemption = await redemptionRepo.save(redemptionRepo.create({
        memberId: dto.memberId,
        voucherBatchId: firstBatchId,
        optionId: option.id,
        orderId: order.id,
        voucherCount: requiredCount,
        itemsSnapshot: JSON.stringify(this.snapshotItems(option)),
      }));

      await this.adminNotificationsService.createOrderNotification(order, manager);

      return { order, redemption };
    });
  }

  private async findOption(id: string) {
    const option = await this.optionRepo.findOne({ where: { id } });
    if (!option) throw new NotFoundException('兑换项目不存在');
    return option;
  }

  private async replaceItems(optionId: string, items: WineVoucherRedeemItemDto[]) {
    const rows = items.map((item) => this.optionItemRepo.create({
      optionId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      specType: item.specType || 'single',
    }));
    return this.optionItemRepo.save(rows);
  }

  private snapshotItems(option: WineVoucherRedeemOptionEntity) {
    return (option.items || []).map((item) => ({
      menuItemId: item.menuItemId,
      name: item.menuItem?.name,
      quantity: item.quantity,
      specType: item.specType,
    }));
  }
}
