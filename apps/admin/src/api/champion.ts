import client from './client';
import { Member } from './members';

export interface ChampionEntry {
    rank: number;
    id: string;
    nickname: string;
    avatar?: string;
    points: number;
    levelCode: string;
    levelName: string;
}

export const championApi = {
    /** 获取冠军赛排名列表 */
    async getList(type: 'champion_weekly' | 'champion_monthly') {
        const res = await client.get('/loyalty/champion', { params: { type } });
        return res.data.rankings as ChampionEntry[];
    },

    /** 批量保存排名 */
    async save(type: string, entries: { memberId: string; rank: number }[]) {
        const res = await client.post('/loyalty/champion', { type, entries });
        return res.data;
    },

    /** 删除单个排名 */
    async remove(type: string, memberId: string) {
        const res = await client.delete('/loyalty/champion', { data: { type, memberId } });
        return res.data;
    },
};
