import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingEntity } from './settings.entity';

// 预定义的配置键
export const SETTING_KEYS = {
    RESERVATION_RULES: 'reservation_rules', // 预约规则与礼仪
    STORE_INFO: 'store_info',               // 店铺信息
    POINTS_CONFIG: 'points_config',         // 积分配置
} as const;

// 默认规则礼仪
const DEFAULT_RESERVATION_RULES = [
    '下午场 15:00 开局，16:30 前到场赠送 2000 积分。',
    '晚场 20:00 开局，位置保留至 20:30。',
    '牌桌满员或超时可申请候补排队。',
    '严禁任何形式的场下码分行为。',
    '请保持绅士风度，严禁言语干扰其他玩家。',
    '弃牌请保持沉默，遵守德州礼仪。',
];

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(
        @InjectRepository(SystemSettingEntity)
        private settingsRepo: Repository<SystemSettingEntity>,
    ) { }

    /**
     * 获取配置值
     */
    async get<T = any>(key: string, defaultValue?: T): Promise<T> {
        const setting = await this.settingsRepo.findOne({ where: { key } });
        if (!setting) {
            return defaultValue as T;
        }
        try {
            return JSON.parse(setting.value);
        } catch {
            return setting.value as T;
        }
    }

    /**
     * 设置配置值
     */
    async set(key: string, value: any, description?: string): Promise<void> {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        const existing = await this.settingsRepo.findOne({ where: { key } });
        if (existing) {
            existing.value = stringValue;
            if (description) existing.description = description;
            await this.settingsRepo.save(existing);
        } else {
            await this.settingsRepo.save({
                key,
                value: stringValue,
                description,
            });
        }
    }

    /**
     * 获取预约规则礼仪
     */
    async getReservationRules(): Promise<string[]> {
        return this.get(SETTING_KEYS.RESERVATION_RULES, DEFAULT_RESERVATION_RULES);
    }

    /**
     * 更新预约规则礼仪
     */
    async updateReservationRules(rules: string[]): Promise<void> {
        await this.set(SETTING_KEYS.RESERVATION_RULES, rules, '预约规则与礼仪');
    }

    /**
     * 获取所有配置（管理端用）
     */
    async getAll(): Promise<Record<string, any>> {
        const settings = await this.settingsRepo.find();
        const result: Record<string, any> = {};

        for (const s of settings) {
            try {
                result[s.key] = JSON.parse(s.value);
            } catch {
                result[s.key] = s.value;
            }
        }

        return result;
    }
}
