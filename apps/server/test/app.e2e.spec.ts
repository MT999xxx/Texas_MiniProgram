import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { TableModule } from '../src/tables/table.module';
import { TableEntity, TableStatus } from '../src/tables/table.entity';
import { ReservationModule } from '../src/reservation/reservation.module';
import { ReservationEntity, ReservationStatus } from '../src/reservation/reservation.entity';
import { MenuModule } from '../src/menu/menu.module';
import { MenuCategoryEntity } from '../src/menu/menu-category.entity';
import { MenuItemEntity } from '../src/menu/menu-item.entity';
import { MembershipModule } from '../src/membership/membership.module';
import { MemberEntity } from '../src/membership/member.entity';
import { MembershipLevelEntity } from '../src/membership/membership-level.entity';
import { OrdersModule } from '../src/orders/orders.module';
import { OrderEntity } from '../src/orders/order.entity';
import { OrderItemEntity } from '../src/orders/order-item.entity';
import { LoyaltyModule } from '../src/loyalty/loyalty.module';
import { LoyaltyTransactionEntity, LoyaltyTransactionType } from '../src/loyalty/loyalty-transaction.entity';
import { TableService } from '../src/tables/table.service';
import { RedisService } from '../src/redis/redis.service';

describe('API E2E (sqlite)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  const redisMock = { getClient: () => ({ set: jest.fn(), quit: jest.fn() }) };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [
            TableEntity,
            ReservationEntity,
            MenuCategoryEntity,
            MenuItemEntity,
            MembershipLevelEntity,
            MemberEntity,
            OrderEntity,
            OrderItemEntity,
            LoyaltyTransactionEntity,
          ],
          synchronize: true,
        }),
        TableModule,
        ReservationModule,
        MenuModule,
        MembershipModule,
        OrdersModule,
        LoyaltyModule,
      ],
      providers: [{ provide: RedisService, useValue: redisMock }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reservation flow should update table status', async () => {
    // create table
    const tableRes = await request(app.getHttpServer())
      .post('/tables')
      .send({ name: 'Main-1', category: 'MAIN', capacity: 8 })
      .expect(201);
    const tableId = tableRes.body.id;

    // create reservation
    const reservedAt = new Date().toISOString();
    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .send({ customerName: 'Alice', phone: '13800000000', tableId, reservedAt })
      .expect(201);

    expect(reservationRes.body.status).toBe(ReservationStatus.PENDING);

    // check table status reserved
    const listRes = await request(app.getHttpServer()).get('/tables?status=RESERVED').expect(200);
    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0].id).toBe(tableId);

    // update reservation to CHECKED_IN -> table should be IN_USE
    await request(app.getHttpServer())
      .patch(`/reservations/${reservationRes.body.id}/status`)
      .send({ status: ReservationStatus.CHECKED_IN })
      .expect(200);

    const tableService = moduleRef.get(TableService);
    const updatedTable = await tableService.findById(tableId);
    expect(updatedTable?.status).toBe(TableStatus.IN_USE);

    // cancel reservation -> table back to AVAILABLE
    await request(app.getHttpServer())
      .patch(`/reservations/${reservationRes.body.id}/status`)
      .send({ status: ReservationStatus.CANCELLED })
      .expect(200);
    const availableTable = await tableService.findById(tableId);
    expect(availableTable?.status).toBe(TableStatus.AVAILABLE);
  });

  it('order paid should reduce stock and award loyalty points', async () => {
    // create menu category and item
    const category = await request(app.getHttpServer())
      .post('/menu/categories')
      .send({ name: 'Drinks', sort: 1 })
      .expect(201);
    const item = await request(app.getHttpServer())
      .post('/menu/items')
      .send({ name: 'Beer Tower', categoryId: category.body.id, price: 50, stock: 5 })
      .expect(201);

    // create member
    const member = await request(app.getHttpServer())
      .post('/membership/members')
      .send({ userId: 'openid-1', phone: '13800000001' })
      .expect(201);

    // create table and reservation
    const table = await request(app.getHttpServer())
      .post('/tables')
      .send({ name: 'Side-1', category: 'SIDE', capacity: 6 })
      .expect(201);
    const reservation = await request(app.getHttpServer())
      .post('/reservations')
      .send({ customerName: 'Bob', phone: '13800000002', tableId: table.body.id, reservedAt: new Date().toISOString() })
      .expect(201);

    // create order
    const order = await request(app.getHttpServer())
      .post('/orders')
      .send({
        memberId: member.body.id,
        reservationId: reservation.body.id,
        items: [{ menuItemId: item.body.id, quantity: 2 }],
      })
      .expect(201);
    expect(order.body.totalAmount).toBe('100.00');

    // pay order
    await request(app.getHttpServer())
      .patch(`/orders/${order.body.id}/status`)
      .send({ status: 'PAID' })
      .expect(200);

    // assert stock reduced
    const menuRepo = moduleRef.get(getRepositoryToken(MenuItemEntity));
    const refreshedItem = await menuRepo.findOne({ where: { id: item.body.id } });
    expect(refreshedItem?.stock).toBe(3);

    // assert points awarded
    const memberRepo = moduleRef.get(getRepositoryToken(MemberEntity));
    const refreshedMember = await memberRepo.findOne({ where: { id: member.body.id } });
    expect(refreshedMember?.points).toBe(100);

    // assert loyalty record
    const loyaltyRepo = moduleRef.get(getRepositoryToken(LoyaltyTransactionEntity));
    const loyaltyRecords = await loyaltyRepo.find({
      where: { member: { id: member.body.id } },
      relations: ['member', 'order'],
    });
    expect(loyaltyRecords.length).toBeGreaterThanOrEqual(1);
    expect(loyaltyRecords[0].type).toBe(LoyaltyTransactionType.EARN);
    expect(loyaltyRecords[0].points).toBe(100);
  });
});
