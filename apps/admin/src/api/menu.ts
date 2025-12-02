import client from './client';

export interface MenuCategory {
    id: string;
    name: string;
    sort: number;
    createdAt: string;
    updatedAt: string;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    status: string;
    description?: string;
    category: MenuCategory;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategoryDto {
    name: string;
    sort?: number;
}

export interface CreateMenuItemDto {
    name: string;
    categoryId: string;
    price: number;
    stock: number;
    desc?: string;
    status?: string;
}

export const menuApi = {
    // ===== 分类管理 =====
    async listCategories() {
        const response = await client.get<MenuCategory[]>('/menu/categories');
        return response.data;
    },

    async createCategory(data: CreateCategoryDto) {
        const response = await client.post<MenuCategory>('/menu/categories', data);
        return response.data;
    },

    async updateCategory(id: string, data: Partial<CreateCategoryDto>) {
        const response = await client.put<MenuCategory>(`/menu/categories/${id}`, data);
        return response.data;
    },

    async deleteCategory(id: string) {
        await client.delete(`/menu/categories/${id}`);
    },

    // ===== 菜品管理 =====
    async listMenuItems(categoryId?: string) {
        const response = await client.get<MenuItem[]>('/menu/items', {
            params: categoryId ? { categoryId } : {},
        });
        return response.data;
    },

    async createMenuItem(data: CreateMenuItemDto) {
        const response = await client.post<MenuItem>('/menu/items', data);
        return response.data;
    },

    async updateMenuItem(id: string, data: Partial<CreateMenuItemDto>) {
        const response = await client.put<MenuItem>(`/menu/items/${id}`, data);
        return response.data;
    },

    async deleteMenuItem(id: string) {
        await client.delete(`/menu/items/${id}`);
    },

    async updateStock(id: string, stock: number) {
        const response = await client.patch(`/menu/items/${id}/stock`, { stock });
        return response.data;
    },
};
