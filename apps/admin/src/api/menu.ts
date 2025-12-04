import client from './client';

export interface MenuCategory {
    id: string;
    name: string;
    description?: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: MenuCategory;
    categoryId?: string;
    imageUrl?: string;
    status: 'ON_SALE' | 'OFF_SHELF' | 'SOLD_OUT';
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategoryDto {
    name: string;
    description?: string;
    sortOrder?: number;
}

export interface UpdateCategoryDto {
    name?: string;
    description?: string;
    sortOrder?: number;
}

export interface CreateItemDto {
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    imageUrl?: string;
}

export interface UpdateItemDto {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
    status?: string;
}

export const menuApi = {
    // ========== 分类管理 ==========
    async listCategories(): Promise<MenuCategory[]> {
        const response = await client.get('/menu/categories');
        return response.data;
    },

    async createCategory(data: CreateCategoryDto): Promise<MenuCategory> {
        const response = await client.post('/menu/categories', data);
        return response.data;
    },

    async updateCategory(id: string, data: UpdateCategoryDto): Promise<MenuCategory> {
        const response = await client.patch(`/menu/categories/${id}`, data);
        return response.data;
    },

    async deleteCategory(id: string): Promise<void> {
        await client.delete(`/menu/categories/${id}`);
    },

    // ========== 菜品管理 ==========
    async listItems(categoryId?: string): Promise<MenuItem[]> {
        const response = await client.get('/menu/items', { params: { categoryId } });
        return response.data;
    },

    async getItemById(id: string): Promise<MenuItem> {
        const response = await client.get(`/menu/items/${id}`);
        return response.data;
    },

    async createItem(data: CreateItemDto): Promise<MenuItem> {
        const response = await client.post('/menu/items', data);
        return response.data;
    },

    async updateItem(id: string, data: UpdateItemDto): Promise<MenuItem> {
        const response = await client.patch(`/menu/items/${id}`, data);
        return response.data;
    },

    async updateStock(id: string, stock: number): Promise<MenuItem> {
        const response = await client.patch(`/menu/items/${id}/stock`, { stock });
        return response.data;
    },

    async updateStatus(id: string, status: string): Promise<MenuItem> {
        const response = await client.patch(`/menu/items/${id}/status`, { status });
        return response.data;
    },

    async deleteItem(id: string): Promise<void> {
        await client.delete(`/menu/items/${id}`);
    },
};
