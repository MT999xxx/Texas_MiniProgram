import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitTables1731915490000 implements MigrationInterface {
  name = 'InitTables1731915490000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS membership_levels (
        code varchar(24) NOT NULL,
        name varchar(48) NOT NULL,
        threshold int NOT NULL,
        discount decimal(4,2) NULL,
        benefits varchar(200) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (code)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS members (
        id char(36) NOT NULL,
        userId varchar(64) NOT NULL,
        phone varchar(32) NOT NULL,
        nickname varchar(48) NULL,
        levelCode varchar(24) NULL,
        points int NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT FK_member_level FOREIGN KEY (levelCode) REFERENCES membership_levels(code),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id char(36) NOT NULL,
        name varchar(32) NOT NULL,
        category enum('MAIN','SIDE','DINING') NOT NULL,
        capacity int NOT NULL,
        status enum('AVAILABLE','RESERVED','IN_USE','MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
        isActive tinyint(1) NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id char(36) NOT NULL,
        customerName varchar(64) NOT NULL,
        phone varchar(32) NOT NULL,
        status enum('PENDING','CONFIRMED','CHECKED_IN','CANCELLED') NOT NULL DEFAULT 'PENDING',
        reservedAt datetime NOT NULL,
        note varchar(200) NULL,
        tableId char(36) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT FK_reservation_table FOREIGN KEY (tableId) REFERENCES tables(id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id char(36) NOT NULL,
        name varchar(32) NOT NULL,
        sort int NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id char(36) NOT NULL,
        categoryId char(36) NULL,
        name varchar(64) NOT NULL,
        price decimal(8,2) NOT NULL,
        stock int NOT NULL,
        status enum('ON_SALE','OFF_SHELF','SOLD_OUT') NOT NULL DEFAULT 'ON_SALE',
        description varchar(120) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT FK_menu_item_cat FOREIGN KEY (categoryId) REFERENCES menu_categories(id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id char(36) NOT NULL,
        memberId char(36) NULL,
        reservationId char(36) NULL,
        tableId char(36) NULL,
        totalAmount decimal(10,2) NOT NULL DEFAULT 0,
        status enum('PENDING','PAID','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT FK_order_member FOREIGN KEY (memberId) REFERENCES members(id),
        CONSTRAINT FK_order_reservation FOREIGN KEY (reservationId) REFERENCES reservations(id),
        CONSTRAINT FK_order_table FOREIGN KEY (tableId) REFERENCES tables(id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id char(36) NOT NULL,
        orderId char(36) NULL,
        menuItemId char(36) NULL,
        quantity int NOT NULL,
        amount decimal(10,2) NOT NULL,
        CONSTRAINT FK_order_item_order FOREIGN KEY (orderId) REFERENCES orders(id),
        CONSTRAINT FK_order_item_menu FOREIGN KEY (menuItemId) REFERENCES menu_items(id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id char(36) NOT NULL,
        memberId char(36) NULL,
        orderId char(36) NULL,
        type enum('EARN','REDEEM') NOT NULL,
        points int NOT NULL,
        remark varchar(120) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT FK_loyalty_member FOREIGN KEY (memberId) REFERENCES members(id),
        CONSTRAINT FK_loyalty_order FOREIGN KEY (orderId) REFERENCES orders(id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS loyalty_transactions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders;`);
    await queryRunner.query(`DROP TABLE IF EXISTS menu_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS menu_categories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS reservations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tables;`);
    await queryRunner.query(`DROP TABLE IF EXISTS members;`);
    await queryRunner.query(`DROP TABLE IF EXISTS membership_levels;`);
  }
}
