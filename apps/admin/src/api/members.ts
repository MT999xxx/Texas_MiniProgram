import client from './client';

export interface Member {
    id: string;
    userId: string;
    nickname: string;
    phone: string;
    avatar?: string;
    points: number;
    levelCode?: string;
    level?: MemberLevel;
    createdAt: string;
    updatedAt: string;
}

export interface MemberLevel {
    id: string;
    code: string;
    name: string;
    threshold: number;
    discount: number;
    benefits?: string;
}

export interface CreateMemberDto {
    userId: string;
    nickname: string;
    phone: string;
    levelCode?: string;
    points?: number;
}

export const memberApi = {
    // 获取会员列表
    async list() {
        const response = await client.get<Member[]>('/membership/members');
        return response.data;
    },

    // 获取会员详情
    async getById(id: string) {
        const response = await client.get<Member>(`/membership/members/${id}`);
        return response.data;
    },

    // 创建会员
    async create(data: CreateMemberDto) {
        const response = await client.post<Member>('/membership/members', data);
        return response.data;
    },

    // 更新会员
    async update(id: string, data: Partial<CreateMemberDto>) {
        const response = await client.put<Member>(`/membership/members/${id}`, data);
        return response.data;
    },

    // 调整积分
    async adjustPoints(id: string, delta: number) {
        const response = await client.post(`/membership/members/${id}/adjust-points`, { delta });
        return response.data;
    },

    // 获取等级列表
    async listLevels() {
        const response = await client.get<MemberLevel[]>('/membership/levels');
        return response.data;
    },
};
