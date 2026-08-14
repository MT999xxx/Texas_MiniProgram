import client from './client';

export interface Member {
    id: string;
    nickname: string;
    avatar?: string;
    phone: string;
    points: number;
    coins: number;
    wineVouchers: number;
    lotteryChances: number;
    totalSpent: number;
    totalRechargeAmount: number;
    monthlyTickets: number;
    levelCode?: string;
    level?: {
        code: string;
        name: string;
        threshold: number;
    };
    createdAt: string;
    updatedAt: string;
}

export type MembershipRewardStatus = 'PENDING' | 'ISSUED' | 'CANCELLED';

export interface MembershipRewardGrant {
    id: string;
    memberId: string;
    member: Member;
    levelCode: string;
    levelName: string;
    threshold: number;
    points: number;
    coins: number;
    wineVouchers: number;
    monthlyTickets: number;
    status: MembershipRewardStatus;
    remark?: string;
    issuedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateMembershipRewardPayload {
    points: number;
    coins: number;
    wineVouchers: number;
    monthlyTickets: number;
    remark?: string;
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

    async adjustWineVouchers(id: string, delta: number) {
        const response = await client.patch(`/membership/members/${id}/wine-vouchers`, { delta });
        return response.data;
    },

    async updateLevel(id: string, levelCode: string | null) {
        const response = await client.patch(`/membership/members/${id}/level`, { levelCode });
        return response.data;
    },

    async listRewards(status?: MembershipRewardStatus) {
        const response = await client.get('/membership/rewards', { params: { status } });
        return response.data as MembershipRewardGrant[];
    },

    async updateReward(id: string, payload: UpdateMembershipRewardPayload) {
        const response = await client.patch(`/membership/rewards/${id}`, payload);
        return response.data as MembershipRewardGrant;
    },

    async issueReward(id: string) {
        const response = await client.post(`/membership/rewards/${id}/issue`);
        return response.data as MembershipRewardGrant;
    },
};
