import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateMenuItemDto } from './create-menu-item.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { MenuItemStatus } from '../menu-item.entity';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {
    @ApiPropertyOptional({ enum: MenuItemStatus })
    @IsEnum(MenuItemStatus)
    @IsOptional()
    status?: MenuItemStatus;
}
