import client from './client';

export type AdminNotificationType = 'ORDER' | 'RESERVATION' | 'SYSTEM' | 'WARNING';

export interface AdminNotification {
    id: string;
    type: AdminNotificationType;
    title: string;
    content: string;
    sourceType?: string;
    sourceId?: string;
    readAt?: string;
    createdAt: string;
}

export const adminNotificationsApi = {
    async list(params?: { status?: 'all' | 'unread'; limit?: number }): Promise<AdminNotification[]> {
        const response = await client.get('/admin-notifications', { params });
        return response.data;
    },

    async markRead(id: string): Promise<AdminNotification> {
        const response = await client.patch(`/admin-notifications/${id}/read`);
        return response.data;
    },

    async markAllRead(): Promise<{ success: boolean }> {
        const response = await client.patch('/admin-notifications/read-all');
        return response.data;
    },
};

