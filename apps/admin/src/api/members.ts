import client from './client';

export interface Member {
    id: string;
    nickname: string;
    phone: string;
    points: number;
    totalSpent: number;
    level: {
        id: string;
        name: string;
        level: number;
    };
    createdAt: string;
    updatedAt: string;
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
};
