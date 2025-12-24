import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Delete, Put } from '@nestjs/common';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) { }

  @Post('categories')
  @ApiCreatedResponse({ description: '创建分类成功' })
  @ApiBadRequestResponse({ description: '分类参数错误' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Get('categories')
  @ApiOkResponse({ description: '分类列表' })
  listCategories() {
    return this.menuService.listCategories();
  }

  @Post('items')
  @ApiCreatedResponse({ description: '创建菜品成功' })
  @ApiBadRequestResponse({ description: '分类不存在或参数错误' })
  createItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @Get('items')
  @ApiOkResponse({ description: '菜品列表' })
  listItems(@Query('categoryId') categoryId?: string) {
    return this.menuService.listMenuItems(categoryId);
  }

  @Patch('items/:id/stock')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '库存更新成功' })
  @ApiBadRequestResponse({ description: '菜品不存在或参数错误' })
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.menuService.updateStock(id, dto);
  }

  @Get('items/:id')
  @ApiOkResponse({ description: '菜品详情' })
  getItem(@Param('id') id: string) {
    return this.menuService.getMenuItemById(id);
  }

  @Patch('items/:id')
  @ApiOkResponse({ description: '更新菜品成功' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @Patch('items/:id/status')
  @ApiOkResponse({ description: '更新状态成功' })
  updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.menuService.updateMenuItem(id, { status });
  }

  @Delete('items/:id')
  @ApiOkResponse({ description: '删除菜品成功' })
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }

  @Patch('categories/:id')
  @ApiOkResponse({ description: '更新分类成功' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOkResponse({ description: '删除分类成功' })
  deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }
}
