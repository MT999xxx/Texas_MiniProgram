export type TableCategory = 'MAIN' | 'SIDE' | 'DINING';
export type TableStatus = 'AVAILABLE' | 'RESERVED' | 'IN_USE' | 'MAINTENANCE';

export interface Table {
  id: string;
  name: string;
  category: TableCategory;
  capacity: number;
  status: TableStatus;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  status: string;
  reservedAt: string;
  table: Table;
}
