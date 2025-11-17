import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { MenuCategoryEntity } from './menu-category.entity';
import { MenuItemEntity } from './menu-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MenuCategoryEntity, MenuItemEntity])],
  providers: [MenuService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
