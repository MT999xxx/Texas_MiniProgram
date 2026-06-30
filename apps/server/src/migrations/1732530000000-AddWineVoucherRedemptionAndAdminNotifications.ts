import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddWineVoucherRedemptionAndAdminNotifications1732530000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wine_voucher_redeem_options',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'voucher_package_id', type: 'varchar', length: '64', isNullable: true },
          { name: 'required_voucher_count', type: 'int', default: 1 },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'wine_voucher_redeem_items',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'option_id', type: 'varchar', length: '36' },
          { name: 'menu_item_id', type: 'varchar', length: '36' },
          { name: 'quantity', type: 'int', default: 1 },
          { name: 'spec_type', type: 'varchar', length: '16', default: "'single'" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'wine_voucher_redemptions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'member_id', type: 'varchar', length: '36' },
          { name: 'voucher_batch_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'option_id', type: 'varchar', length: '36' },
          { name: 'order_id', type: 'varchar', length: '36' },
          { name: 'voucher_count', type: 'int' },
          { name: 'items_snapshot', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'admin_notifications',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'type', type: 'enum', enum: ['ORDER', 'RESERVATION', 'SYSTEM', 'WARNING'] },
          { name: 'title', type: 'varchar', length: '100' },
          { name: 'content', type: 'varchar', length: '255' },
          { name: 'source_type', type: 'varchar', length: '32', isNullable: true },
          { name: 'source_id', type: 'varchar', length: '64', isNullable: true },
          { name: 'read_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'wine_voucher_redeem_options',
      new TableIndex({
        name: 'IDX_wine_voucher_redeem_options_active_sort',
        columnNames: ['is_active', 'sort_order'],
      }),
    );

    await queryRunner.createIndex(
      'wine_voucher_redeem_items',
      new TableIndex({
        name: 'IDX_wine_voucher_redeem_items_option',
        columnNames: ['option_id'],
      }),
    );

    await queryRunner.createIndex(
      'wine_voucher_redemptions',
      new TableIndex({
        name: 'IDX_wine_voucher_redemptions_member_created',
        columnNames: ['member_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'admin_notifications',
      new TableIndex({
        name: 'IDX_admin_notifications_read_created',
        columnNames: ['read_at', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('admin_notifications', 'IDX_admin_notifications_read_created');
    await queryRunner.dropIndex('wine_voucher_redemptions', 'IDX_wine_voucher_redemptions_member_created');
    await queryRunner.dropIndex('wine_voucher_redeem_items', 'IDX_wine_voucher_redeem_items_option');
    await queryRunner.dropIndex('wine_voucher_redeem_options', 'IDX_wine_voucher_redeem_options_active_sort');
    await queryRunner.dropTable('admin_notifications');
    await queryRunner.dropTable('wine_voucher_redemptions');
    await queryRunner.dropTable('wine_voucher_redeem_items');
    await queryRunner.dropTable('wine_voucher_redeem_options');
  }
}

