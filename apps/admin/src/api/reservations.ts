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
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationListParams {
  status?: string;
  tableId?: string;
  memberId?: string;
  date?: string;
}

export interface CreateReservationDto {
  memberId: string;
  tableId: string;
  reservedAt: string;
  depositAmount?: number;
  remark?: string;
}

export interface UpdateReservationDto {
  tableId?: string;
  reservedAt?: string;
  depositAmount?: number;
  remark?: string;
}

export const reservationApi = {
  // 获取预约列表
  async list(params?: ReservationListParams): Promise<Reservation[]> {
    const response = await client.get('/reservations', { params });
    return response.data;
  },

  // 获取预约详情
  async getById(id: string): Promise<Reservation> {
    const response = await client.get(`/reservations/${id}`);
    return response.data;
  },

  // 创建预约（管理员）
  async create(data: CreateReservationDto): Promise<Reservation> {
    const response = await client.post('/reservations', data);
    return response.data;
  },

  // 更新预约
  async update(id: string, data: UpdateReservationDto): Promise<Reservation> {
    const response = await client.patch(`/reservations/${id}`, data);
    return response.data;
  },

  // 更新预约状态
  async updateStatus(id: string, status: string): Promise<Reservation> {
    const response = await client.patch(`/reservations/${id}/status`, { status });
    return response.data;
  },

  // 取消预约
  async cancel(id: string, reason?: string): Promise<Reservation> {
    const response = await client.post(`/reservations/${id}/cancel`, { reason });
    return response.data;
  },

  // 获取可用桌位
  async getAvailableTables(date: string): Promise<Array<{ id: string; name: string; category: string }>> {
    const response = await client.get('/reservations/available-tables', { params: { date } });
    return response.data;
  },
};
