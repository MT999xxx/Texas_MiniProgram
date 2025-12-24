import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuCategoryEntity } from './menu-category.entity';
import { MenuItemEntity, MenuItemStatus } from './menu-item.entity';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategoryEntity)
    private readonly categoryRepo: Repository<MenuCategoryEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly itemRepo: Repository<MenuItemEntity>,
  ) { }

  createCategory(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({
      name: dto.name,
      sort: dto.sort ?? 1,
      description: dto.description
    });
    return this.categoryRepo.save(category);
  }

  listCategories() {
    return this.categoryRepo.find({ order: { sort: 'ASC', createdAt: 'ASC' } });
  }

  async createMenuItem(dto: CreateMenuItemDto) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const item = this.itemRepo.create({
      category,
      name: dto.name,
      price: dto.price,
      stock: dto.stock,
      status: dto.status ?? MenuItemStatus.ON_SALE,
      description: dto.description,
      imageUrl: dto.imageUrl,
    });
    return this.itemRepo.save(item);
  }

  listMenuItems(categoryId?: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId || '');
    return this.itemRepo.find({
      where: isUuid ? { category: { id: categoryId } } : {},
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStock(id: string, dto: UpdateStockDto) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    item.stock = dto.stock;
    if (item.stock === 0) {
      item.status = MenuItemStatus.SOLD_OUT;
    }
    return this.itemRepo.save(item);
  }

  getMenuItemById(id: string) {
    return this.itemRepo.findOne({ where: { id }, relations: ['category'] });
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      item.category = category;
    }

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.price !== undefined) item.price = dto.price;
    if (dto.stock !== undefined) item.stock = dto.stock;
    if (dto.status !== undefined) item.status = dto.status;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.imageUrl !== undefined) item.imageUrl = dto.imageUrl;

    return this.itemRepo.save(item);
  }

  async deleteMenuItem(id: string) {
    const result = await this.itemRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Menu item not found');
    }
    return { success: true };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.sort !== undefined) category.sort = dto.sort;

    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string) {
    // 检查是否有菜品属于该分类
    const itemCount = await this.itemRepo.count({ where: { category: { id } } });
    if (itemCount > 0) {
      throw new Error('无法删除包含菜品的分类');
    }

    const result = await this.categoryRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
    return { success: true };
  }
}
