import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddPrintJobs1732540000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'print_jobs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'order_id', type: 'varchar', length: '36', isUnique: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'PRINTING', 'PRINTED', 'FAILED'],
            default: "'PENDING'",
          },
          { name: 'payload', type: 'text' },
          { name: 'attempts', type: 'int', default: 0 },
          { name: 'last_error', type: 'text', isNullable: true },
          { name: 'claimed_at', type: 'timestamp', isNullable: true },
          { name: 'printed_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'print_jobs',
      new TableIndex({
        name: 'IDX_print_jobs_status_created',
        columnNames: ['status', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('print_jobs', 'IDX_print_jobs_status_created');
    await queryRunner.dropTable('print_jobs');
  }
}
