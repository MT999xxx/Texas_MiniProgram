import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddWineVoucherBatches1732520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wine_voucher_batches',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'member_id', type: 'varchar', length: '36' },
          { name: 'source_type', type: 'varchar', length: '32' },
          { name: 'source_id', type: 'varchar', length: '64', isNullable: true },
          { name: 'package_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'quantity', type: 'int' },
          { name: 'remaining_quantity', type: 'int' },
          { name: 'bonus_points', type: 'int', default: 0 },
          { name: 'expires_at', type: 'timestamp' },
          { name: 'remark', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'wine_voucher_batches',
      new TableIndex({
        name: 'IDX_wine_voucher_batches_member_expiry',
        columnNames: ['member_id', 'expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('wine_voucher_batches', 'IDX_wine_voucher_batches_member_expiry');
    await queryRunner.dropTable('wine_voucher_batches');
  }
}
