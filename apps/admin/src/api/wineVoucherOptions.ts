import client from './client';
import { MenuItem } from './menu';

export interface WineVoucherOptionItem {
    id?: string;
    menuItemId: string;
    menuItem?: MenuItem;
    quantity: number;
    specType?: string;
}

export interface WineVoucherOption {
    id: string;
    name: string;
    description?: string;
    voucherPackageId?: string;
    requiredVoucherCount: number;
    isActive: boolean;
    sortOrder: number;
    items: WineVoucherOptionItem[];
    createdAt: string;
    updatedAt: string;
}

export interface SaveWineVoucherOptionDto {
    name: string;
    description?: string;
    voucherPackageId?: string;
    requiredVoucherCount?: number;
    isActive?: boolean;
    sortOrder?: number;
    items: {
        menuItemId: string;
        quantity: number;
        specType?: string;
    }[];
}

export const wineVoucherOptionsApi = {
    async listAdmin(): Promise<WineVoucherOption[]> {
        const response = await client.get('/wine-voucher-options/admin');
        return response.data;
    },

    async listActive(): Promise<WineVoucherOption[]> {
        const response = await client.get('/wine-voucher-options');
        return response.data;
    },

    async create(data: SaveWineVoucherOptionDto): Promise<WineVoucherOption> {
        const response = await client.post('/wine-voucher-options', data);
        return response.data;
    },

    async update(id: string, data: Partial<SaveWineVoucherOptionDto>): Promise<WineVoucherOption> {
        const response = await client.patch(`/wine-voucher-options/${id}`, data);
        return response.data;
    },

    async disable(id: string): Promise<WineVoucherOption> {
        const response = await client.delete(`/wine-voucher-options/${id}`);
        return response.data;
    },
};

