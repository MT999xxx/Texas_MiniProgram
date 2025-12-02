import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

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

  @Put('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新分类成功' })
  @ApiBadRequestResponse({ description: '分类不存在' })
  updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: '删除分类成功' })
  @ApiBadRequestResponse({ description: '分类不存在或有关联菜品' })
  async deleteCategory(@Param('id') id: string) {
    await this.menuService.deleteCategory(id);
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

  @Put('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '更新菜品成功' })
  @ApiBadRequestResponse({ description: '菜品不存在' })
  updateItem(@Param('id') id: string, @Body() dto: Partial<CreateMenuItemDto>) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: '删除菜品成功' })
  @ApiBadRequestResponse({ description: '菜品不存在' })
  async deleteItem(@Param('id') id: string) {
    await this.menuService.deleteMenuItem(id);
  }

  @Patch('items/:id/stock')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '库存更新成功' })
  @ApiBadRequestResponse({ description: '菜品不存在或参数错误' })
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.menuService.updateStock(id, dto);
  }
}
