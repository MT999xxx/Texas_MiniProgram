import client from './client';

export interface OrderItem {
    id: string;
    menuItem: {
        id: string;
        name: string;
        price: number;
    };
    quantity: number;
    price: number;
    subtotal: number;
}

export interface Order {
    id: string;
    orderNo: string;
    member: {
        id: string;
        nickname: string;
        phone: string;
    };
    table?: {
        id: string;
        name: string;
    };
    items: OrderItem[];
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
    paymentMethod?: string;
    paidAt?: string;
    remark?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrderListParams {
    status?: string;
    memberId?: string;
    startDate?: string;
    endDate?: string;
}

export interface RefundDto {
    reason: string;
    amount?: number;
}

export const orderApi = {
    // 获取订单列表
    async list(params?: OrderListParams): Promise<Order[]> {
        const response = await client.get('/orders', { params });
        return response.data;
    },

    // 获取订单详情
    async getById(id: string): Promise<Order> {
        const response = await client.get(`/orders/${id}`);
        return response.data;
    },

    // 更新订单状态
    async updateStatus(id: string, status: string): Promise<Order> {
        const response = await client.patch(`/orders/${id}/status`, { status });
        return response.data;
    },

    // 申请退款
    async refund(id: string, data: RefundDto): Promise<Order> {
        const response = await client.post(`/orders/${id}/refund`, data);
        return response.data;
    },

    // 添加备注
    async addRemark(id: string, remark: string): Promise<Order> {
        const response = await client.patch(`/orders/${id}/remark`, { remark });
        return response.data;
    },

    // 获取订单统计
    async getStats(params?: { startDate?: string; endDate?: string }): Promise<{
        totalOrders: number;
        totalAmount: number;
        completedOrders: number;
        averageAmount: number;
    }> {
        const response = await client.get('/orders/stats', { params });
        return response.data;
    },
};
