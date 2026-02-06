import { apiClient } from './client';

export interface ReservationRulesResponse {
    rules: string[];
}

export const settingsApi = {
    /**
     * 获取预约规则礼仪
     */
    getReservationRules: async (): Promise<string[]> => {
        const response = await apiClient.get<ReservationRulesResponse>('/settings/reservation-rules');
        return response.data.rules;
    },

    /**
     * 更新预约规则礼仪
     */
    updateReservationRules: async (rules: string[]): Promise<void> => {
        await apiClient.put('/settings/reservation-rules', { rules });
    },
};
