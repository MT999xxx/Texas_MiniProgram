import client from './client';

export interface Member {
    id: string;
    nickname: string;
    phone: string;
    points: number;
    coins: number;
    lotteryChances: number;
    totalSpent: number;
    level: {
        id: string;
        name: string;
        level: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface PointDeposit {
    id: string;
    memberId: string;
    member: Member;
    points: number;
    actualPoints: number;
    lotteryChances: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewRemark?: string;
    createdAt: string;
}

export const memberApi = {
    async list(levelCode?: string) {
        const response = await client.get('/membership/members', { params: { levelCode } });
        return response.data;
    },

    async adjustPoints(id: string, delta: number) {
        const response = await client.patch(`/membership/members/${id}/points`, { delta });
        return response.data;
    },

    async listLevels() {
        const response = await client.get('/membership/levels');
        return response.data;
    },

    // === 金币与积分 ===
    async getDepositRequests(status?: string) {
        const response = await client.get('/coins/points/deposits', { params: { status } });
        return response.data;
    },

    async reviewDeposit(id: string, status: 'APPROVED' | 'REJECTED', remark?: string) {
        const response = await client.patch(`/coins/points/deposits/${id}/review`, { status, remark });
        return response.data;
    },

    async adjustCoins(id: string, delta: number) {
        const response = await client.patch(`/membership/members/${id}/coins`, { delta });
        return response.data;
    },
};
