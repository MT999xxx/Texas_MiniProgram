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
    imageUrl?: string;
    isAvailable: boolean;
    createdAt: string;
    updatedAt: string;
}

export const menuApi = {
    // 分类
    async listCategories() {
        const response = await client.get('/menu/categories');
        return response.data;
    },

    async createCategory(data: { name: string; description?: string; sortOrder: number }) {
        const response = await client.post('/menu/categories', data);
        return response.data;
    },

    // 菜品
    async listItems(categoryId?: string) {
        const response = await client.get('/menu/items', { params: { categoryId } });
        return response.data;
    },

    async createItem(data: {
        categoryId: string;
        name: string;
        description?: string;
        price: number;
        stock: number;
    }) {
        const response = await client.post('/menu/items', data);
        return response.data;
    },

    async updateStock(id: string, stock: number) {
        const response = await client.patch(`/menu/items/${id}/stock`, { stock });
        return response.data;
    },
};
