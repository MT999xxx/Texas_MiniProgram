import client from './client';

export interface Table {
  id: string;
  name: string;
  category: 'MAIN' | 'SIDE' | 'DINING';
  capacity: number;
  status: 'AVAILABLE' | 'RESERVED' | 'IN_USE' | 'MAINTENANCE';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableListParams {
  category?: string;
  status?: string;
}

export const tableApi = {
  // 获取桌位列表
  async list(params?: TableListParams) {
    const response = await client.get('/tables', { params });
    return response.data;
  },

  // 更新桌位状态
  async updateStatus(id: string, status: string) {
    const response = await client.patch(`/tables/${id}/status`, { status });
    return response.data;
  },
};
