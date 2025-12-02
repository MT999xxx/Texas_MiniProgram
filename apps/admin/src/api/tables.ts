import client from './client';

export enum TableCategory {
  MAIN = 'MAIN',
  SIDE = 'SIDE',
  DINING = 'DINING',
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
}

export interface Table {
  id: string;
  name: string;
  category: TableCategory;
  capacity: number;
  status: TableStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTableDto {
  name: string;
  category: TableCategory;
  capacity: number;
  description?: string;
}

export interface UpdateTableDto {
  name?: string;
  category?: TableCategory;
  capacity?: number;
}

export const tableApi = {
  // 获取桌位列表
  async list(params?: { category?: TableCategory; status?: TableStatus }) {
    const response = await client.get<Table[]>('/tables', { params });
    return response.data;
  },

  // 创建桌位
  async create(data: CreateTableDto) {
    const response = await client.post<Table>('/tables', data);
    return response.data;
  },

  // 更新桌位
  async update(id: string, data: UpdateTableDto) {
    const response = await client.put<Table>(`/tables/${id}`, data);
    return response.data;
  },

  // 更新桌位状态
  async updateStatus(id: string, status: TableStatus) {
    const response = await client.patch(`/tables/${id}/status`, { status });
    return response.data;
  },

  // 删除桌位
  async delete(id: string) {
    await client.delete(`/tables/${id}`);
  },
};
