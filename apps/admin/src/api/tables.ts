import client from './client';
import { Table, TableStatus } from '../types';

export const fetchTables = async (status?: TableStatus) => {
  const res = await client.get<Table[]>('/tables', {
    params: { status },
  });
  return res.data;
};
