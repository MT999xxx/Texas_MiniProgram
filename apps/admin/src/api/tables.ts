import client from './client';

export interface Table {
  id: string;
  name: string;
  category: 'MAIN' | 'SIDE' | 'TRAINING' | 'DINING';
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

export interface CreateTableDto {
  name: string;
  category: string;
  capacity: number;
  description?: string;
}

export interface UpdateTableDto {
  name?: string;
  category?: string;
  capacity?: number;
  description?: string;
  status?: string;
}

export const tableApi = {
  // 获取桌位列表
  async list(params?: TableListParams): Promise<Table[]> {
    const response = await client.get('/tables', { params });
    return response.data;
  },

  // 获取桌位详情
  async getById(id: string): Promise<Table> {
    const response = await client.get(`/tables/${id}`);
    return response.data;
  },

  // 创建桌位
  async create(data: CreateTableDto): Promise<Table> {
    const response = await client.post('/tables', data);
    return response.data;
  },

  // 更新桌位
  async update(id: string, data: UpdateTableDto): Promise<Table> {
    const response = await client.patch(`/tables/${id}`, data);
    return response.data;
  },

  // 更新桌位状态
  async updateStatus(id: string, status: string): Promise<Table> {
    const response = await client.patch(`/tables/${id}/status`, { status });
    return response.data;
  },

  // 删除桌位
  async delete(id: string): Promise<void> {
    await client.delete(`/tables/${id}`);
  },
};
