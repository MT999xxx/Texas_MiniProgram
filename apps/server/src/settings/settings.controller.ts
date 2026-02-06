import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    /**
     * 获取预约规则礼仪（公开API，小程序用）
     */
    @Get('reservation-rules')
    @ApiOperation({ summary: '获取预约规则礼仪' })
    @ApiResponse({ status: 200, description: '返回规则列表' })
    async getReservationRules() {
        const rules = await this.settingsService.getReservationRules();
        return { rules };
    }

    /**
     * 更新预约规则礼仪（管理端）
     */
    @Put('reservation-rules')
    @ApiOperation({ summary: '更新预约规则礼仪' })
    @ApiResponse({ status: 200, description: '更新成功' })
    async updateReservationRules(@Body() body: { rules: string[] }) {
        await this.settingsService.updateReservationRules(body.rules);
        return { success: true, message: '规则更新成功' };
    }

    /**
     * 获取所有配置（管理端）
     */
    @Get('all')
    @ApiOperation({ summary: '获取所有系统配置' })
    async getAllSettings() {
        return this.settingsService.getAll();
    }
}
