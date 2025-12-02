import client from './client';

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  partySize: number;
  reservedAt: string;
  note?: string;
  status: ReservationStatus;
  table: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface CreateReservationDto {
  tableId: string;
  customerName: string;
  phone: string;
  partySize: number;
  reservedAt: string;
  note?: string;
  memberId?: string;
}

export const reservationApi = {
  // 获取预约列表
  async list(params?: { status?: ReservationStatus; tableId?: string; memberId?: string }) {
    const response = await client.get<Reservation[]>('/reservations', { params });
    return response.data;
  },

  // 创建预约
  async create(data: CreateReservationDto) {
    const response = await client.post<Reservation>('/reservations', data);
    return response.data;
  },

  // 更新预约
  async update(id: string, data: Partial<CreateReservationDto>) {
    const response = await client.put<Reservation>(`/reservations/${id}`, data);
    return response.data;
  },

  // 更新预约状态
  async updateStatus(id: string, status: ReservationStatus) {
    const response = await client.patch(`/reservations/${id}/status`, { status });
    return response.data;
  },

  // 删除预约
  async delete(id: string) {
    await client.delete(`/reservations/${id}`);
  },

  // 取消预约
  async cancel(id: string, reason?: string) {
    const response = await client.post(`/reservations/${id}/cancel`, { reason });
    return response.data;
  },
};
