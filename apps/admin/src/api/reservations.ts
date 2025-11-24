import client from './client';

export interface Reservation {
  id: string;
  member: {
    id: string;
    nickname: string;
    phone: string;
  };
  table: {
    id: string;
    name: string;
    category: string;
  };
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  reservedAt: string;
  depositAmount?: number;
  depositPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationListParams {
  status?: string;
  tableId?: string;
  memberId?: string;
}

export const reservationApi = {
  // 获取预约列表
  async list(params?: ReservationListParams) {
    const response = await client.get('/reservations', { params });
    return response.data;
  },

  // 获取预约详情
  async getById(id: string) {
    const response = await client.get(`/reservations/${id}`);
    return response.data;
  },

  // 更新预约状态
  async updateStatus(id: string, status: string) {
    const response = await client.patch(`/reservations/${id}/status`, { status });
    return response.data;
  },

  // 取消预约
  async cancel(id: string, reason?: string) {
    const response = await client.post(`/reservations/${id}/cancel`, { reason });
    return response.data;
  },
};
