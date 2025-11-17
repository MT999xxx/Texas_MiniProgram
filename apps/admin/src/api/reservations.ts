import client from './client';
import { Reservation } from '../types';

export interface CreateReservationPayload {
  customerName: string;
  phone: string;
  tableId: string;
  reservedAt: string;
  note?: string;
}

export const fetchReservations = async () => {
  const res = await client.get<Reservation[]>('/reservations');
  return res.data;
};

export const createReservation = async (payload: CreateReservationPayload) => {
  const res = await client.post<Reservation>('/reservations', payload);
  return res.data;
};
