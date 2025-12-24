import client from './client';

export interface DashboardSummary {
    totalReservations: number;
    memberVisits: number;
    totalRevenue: number;
}

export const statisticsApi = {
    getSummary: () => client.get<DashboardSummary>('/statistics/summary'),
};
