import client from './client';

export interface Order {
    id: string;
    member: {
        id: string;
        nickname: string;
        phone: string;
    };
    table?: {
        id: string;
        name: string;
    };
    items: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
    }>;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    updatedAt: string;
}

export const orderApi = {
    async list(params?: { status?: string; memberId?: string; tableId?: string }) {
        const response = await client.get('/orders', { params });
        return response.data;
    },

    async getById(id: string) {
        const response = await client.get(`/orders/${id}`);
        return response.data;
    },

    async updateStatus(id: string, status: string) {
        const response = await client.patch(`/orders/${id}/status`, { status });
        return response.data;
    },
};
