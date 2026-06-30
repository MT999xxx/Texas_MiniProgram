import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MenuItemEntity } from '../menu/menu-item.entity';
import { WineVoucherRedeemOptionEntity } from './wine-voucher-redeem-option.entity';

@Entity('wine_voucher_redeem_items')
export class WineVoucherRedeemItemEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '兑换项ID' })
  @Column({ name: 'option_id' })
  optionId!: string;

  @ManyToOne(() => WineVoucherRedeemOptionEntity, (option) => option.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'option_id' })
  option!: WineVoucherRedeemOptionEntity;

  @ApiProperty({ description: '菜单商品ID' })
  @Column({ name: 'menu_item_id' })
  menuItemId!: string;

  @ApiProperty({ type: () => MenuItemEntity })
  @ManyToOne(() => MenuItemEntity, { eager: true })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem!: MenuItemEntity;

  @ApiProperty({ description: '数量' })
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @ApiProperty({ description: '规格 single/half_dozen/dozen' })
  @Column({ length: 16, default: 'single', name: 'spec_type' })
  specType!: string;
}

