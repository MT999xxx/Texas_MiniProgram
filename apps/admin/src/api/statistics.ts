import client from './client';

export interface DashboardSummary {
    totalReservations: number;
    memberVisits: number;
    totalRevenue: number;
}

export interface RevenueTrendItem {
    date: string;
    revenue: number;
}

export interface HotMenuItem {
    name: string;
    sales: number;
}

export interface LeaderboardItem {
    rank: number;
    id: string;
    name: string;
    avatar: string;
    score: number;
    tag: string;
}

export const statisticsApi = {
    getSummary: () => client.get<DashboardSummary>('/statistics/summary'),
    getRevenueTrend: (range: '7d' | '1m' | '6m' = '7d') => client.get<RevenueTrendItem[]>(`/statistics/revenue-trend?range=${range}`),
    getHotMenuItems: () => client.get<HotMenuItem[]>('/statistics/hot-menu'),
    getLeaderboard: (limit: number = 10) => client.get<LeaderboardItem[]>(`/statistics/leaderboard?limit=${limit}`),
};
