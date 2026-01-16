import client from './client';

export interface Transaction {
    id: string;
    memberId: string;
    type: 'RECHARGE' | 'EXCHANGE' | 'CONSUME' | 'WITHDRAW';
    amount: number;
    paymentAmount?: number;
    pointsUsed?: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    remark?: string;
    createdAt: string;
    member?: {
        id: string;
        nickname?: string;
        phone?: string;
    };
}

export const transactionApi = {
    /**
     * 获取所有交易记录（管理员）
     */
    list: async (type?: string): Promise<Transaction[]> => {
        const params = type ? { type } : {};
        const res = await client.get('/coins/transactions', { params });
        return res.data;
    },
};
