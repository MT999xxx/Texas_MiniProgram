import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuCategoryEntity } from './menu-category.entity';
import { MenuItemEntity, MenuItemStatus } from './menu-item.entity';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategoryEntity)
    private readonly categoryRepo: Repository<MenuCategoryEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly itemRepo: Repository<MenuItemEntity>,
  ) { }

  createCategory(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({ name: dto.name, sort: dto.sort ?? 1 });
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
      description: dto.desc,
    });
    return this.itemRepo.save(item);
  }

  listMenuItems(categoryId?: string) {
    return this.itemRepo.find({
      where: categoryId ? { category: { id: categoryId } } : {},
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
}
