import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { MEMBERSHIP_LEVEL_RULES, formatMembershipBenefits } from '../membership/membership-level-rules';

export class AddMembershipLevelRewards1732550000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const rule of MEMBERSHIP_LEVEL_RULES) {
      await queryRunner.query(
        `INSERT INTO membership_levels (code, name, threshold, benefits)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), threshold = VALUES(threshold), benefits = VALUES(benefits)`,
        [rule.code, rule.name, rule.threshold, formatMembershipBenefits(rule)],
      );
    }

    if (!(await queryRunner.hasColumn('members', 'totalRechargeAmount'))) {
      await queryRunner.addColumn('members', new TableColumn({
        name: 'totalRechargeAmount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
      }));
    }
    if (!(await queryRunner.hasColumn('members', 'monthlyTickets'))) {
      await queryRunner.addColumn('members', new TableColumn({ name: 'monthlyTickets', type: 'int', default: 0 }));
    }
    if (!(await queryRunner.hasColumn('members', 'membershipRewardLevel'))) {
      await queryRunner.addColumn('members', new TableColumn({ name: 'membershipRewardLevel', type: 'int', default: 1 }));
    }
    if (!(await queryRunner.hasColumn('members', 'membershipRewardInitialized'))) {
      await queryRunner.addColumn('members', new TableColumn({ name: 'membershipRewardInitialized', type: 'boolean', default: false }));
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS membership_reward_grants (
        id varchar(36) NOT NULL,
        member_id varchar(36) NOT NULL,
        level_code varchar(24) NOT NULL,
        level_name varchar(48) NOT NULL,
        threshold decimal(12,2) NOT NULL,
        points int NOT NULL DEFAULT 0,
        coins decimal(10,2) NOT NULL DEFAULT 0,
        wine_vouchers int NOT NULL DEFAULT 0,
        monthly_tickets int NOT NULL DEFAULT 0,
        status enum('PENDING','ISSUED','CANCELLED') NOT NULL DEFAULT 'PENDING',
        remark varchar(255) NULL,
        issued_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_membership_reward_member_level (member_id, level_code),
        KEY IDX_membership_reward_status_created (status, created_at),
        CONSTRAINT FK_membership_reward_member FOREIGN KEY (member_id) REFERENCES members(id)
      ) ENGINE=InnoDB;
    `);

    if (await queryRunner.hasTable('coin_transactions')) {
      await queryRunner.query(`
        UPDATE members m
        LEFT JOIN (
          SELECT memberId, COALESCE(SUM(paymentAmount), 0) AS total
          FROM coin_transactions
          WHERE type = 'RECHARGE' AND status = 'SUCCESS'
          GROUP BY memberId
        ) recharge ON recharge.memberId = m.id
        SET m.totalRechargeAmount = COALESCE(recharge.total, 0)
      `);
    }

    const storedNumberCase = [
      `WHEN levelCode = 'VP' THEN 10`,
      ...[...MEMBERSHIP_LEVEL_RULES]
        .reverse()
        .map((rule) => `WHEN levelCode = '${rule.code}' THEN ${rule.level}`),
    ].join(' ');
    await queryRunner.query(`
      UPDATE members
      SET membershipRewardLevel = CASE ${storedNumberCase} ELSE 1 END,
          membershipRewardInitialized = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('membership_reward_grants')) {
      await queryRunner.dropTable('membership_reward_grants');
    }
    for (const column of ['membershipRewardInitialized', 'membershipRewardLevel', 'monthlyTickets', 'totalRechargeAmount']) {
      if (await queryRunner.hasColumn('members', column)) {
        await queryRunner.dropColumn('members', column);
      }
    }
  }
}
