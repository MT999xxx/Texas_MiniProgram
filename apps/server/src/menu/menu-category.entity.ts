import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MenuItemEntity } from './menu-item.entity';

@Entity('menu_categories')
export class MenuCategoryEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '分类名称' })
  @Column({ length: 32 })
  name!: string;

  @ApiProperty({ description: '排序' })
  @Column({ type: 'int', default: 1 })
  sort!: number;

  @ApiPropertyOptional({ type: () => [MenuItemEntity] })
  @OneToMany(() => MenuItemEntity, (item) => item.category)
  items!: MenuItemEntity[];

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt!: Date;
}
