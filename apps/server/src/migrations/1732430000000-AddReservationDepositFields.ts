import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReservationDepositFields1732430000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 添加预约订金相关字段到reservations表
        await queryRunner.addColumn('reservations', new TableColumn({
            name: 'deposit_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
        }));

        await queryRunner.addColumn('reservations', new TableColumn({
            name: 'deposit_paid',
            type: 'boolean',
            default: false,
        }));

        await queryRunner.addColumn('reservations', new TableColumn({
            name: 'payment_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
        }));

        // 添加预约ID字段到payments表
        await queryRunner.addColumn('payments', new TableColumn({
            name: 'reservation_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚迁移
        await queryRunner.dropColumn('reservations', 'payment_id');
        await queryRunner.dropColumn('reservations', 'deposit_paid');
        await queryRunner.dropColumn('reservations', 'deposit_amount');
        await queryRunner.dropColumn('payments', 'reservation_id');
    }
}
