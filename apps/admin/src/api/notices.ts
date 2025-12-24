import client from './client';

export type NoticeType = 'ANNOUNCEMENT' | 'ACTIVITY';

export interface Notice {
    id: string;
    type: NoticeType;
    title: string;
    content: string;
    isActive: boolean;
    createdAt: string;
}

export interface CreateNoticeDto {
    type: NoticeType;
    title: string;
    content: string;
    isActive?: boolean;
}

export const noticesApi = {
    create: (data: CreateNoticeDto) => client.post<Notice>('/notices', data),
    list: (type?: NoticeType) => client.get<Notice[]>('/notices', { params: { type } }),
    getLatest: (type: NoticeType) => client.get<Notice>('/notices/latest', { params: { type } }),
    update: (id: string, data: Partial<CreateNoticeDto>) => client.patch<Notice>(`/notices/${id}`, data),
    delete: (id: string) => client.delete(`/notices/${id}`),
};
