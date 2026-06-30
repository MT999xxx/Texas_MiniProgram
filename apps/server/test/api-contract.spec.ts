import fs from 'fs';
import path from 'path';
import { OrdersController } from '../src/orders/orders.controller';
import { ReservationController } from '../src/reservation/reservation.controller';
import { TableController } from '../src/tables/table.controller';
import { CoinsController } from '../src/coins/coins.controller';

const srcRoot = path.join(__dirname, '../src');

function loadControllerPrototype(relativePath: string, exportName: string) {
  const filePath = path.join(srcRoot, relativePath);
  expect(fs.existsSync(filePath)).toBe(true);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(filePath);
  expect(mod[exportName]).toBeDefined();
  return mod[exportName].prototype as any;
}

describe('runtime and API contracts', () => {
  it('keeps bootstrap calls executable instead of hidden in comments', () => {
    const main = fs.readFileSync(path.join(__dirname, '../src/main.ts'), 'utf8');
    const executableLines = main
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'));

    expect(executableLines).toContain('app.enableCors({');
    expect(executableLines.some((line) => line.startsWith('app.useStaticAssets('))).toBe(true);
  });

  it('keeps mini-program request header setup executable', () => {
    const request = fs.readFileSync(path.join(__dirname, '../../mp/utils/request.js'), 'utf8');
    const executableLines = request
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'));

    expect(executableLines).toContain('const headers = {');
    expect(executableLines).toContain('if (token) {');
    expect(executableLines).toContain("wx.removeStorageSync('token');");
  });

  it('keeps order detail page using the callable request client', () => {
    const orderDetail = fs.readFileSync(path.join(__dirname, '../../mp/pages/order-detail/index.js'), 'utf8');

    expect(orderDetail).toContain("const request = require('../../utils/request');");
    expect(orderDetail).not.toContain("const { request } = require('../../utils/request');");
  });

  it('exposes reservation endpoints used by admin', () => {
    const controller = ReservationController.prototype as any;

    expect(typeof controller.update).toBe('function');
    expect(typeof controller.getAvailableTables).toBe('function');
  });

  it('exposes order remark endpoint used by admin', () => {
    const controller = OrdersController.prototype as any;

    expect(typeof controller.updateRemark).toBe('function');
  });

  it('exposes waiting list endpoint used by mini-program', () => {
    const controller = TableController.prototype as any;

    expect(typeof controller.joinWaitingList).toBe('function');
  });

  it('exposes wine voucher and coin package endpoints used by mini-program', () => {
    const controller = CoinsController.prototype as any;

    expect(typeof controller.getCoinRechargePackages).toBe('function');
    expect(typeof controller.getWineVoucherPackages).toBe('function');
    expect(typeof controller.purchaseWineVoucher).toBe('function');
    expect(typeof controller.getPointRecords).toBe('function');
  });

  it('exposes wine voucher redemption option endpoints used by admin and mini-program', () => {
    const controller = loadControllerPrototype(
      'coins/wine-voucher-options.controller.ts',
      'WineVoucherOptionsController',
    );

    expect(typeof controller.listActive).toBe('function');
    expect(typeof controller.listAdmin).toBe('function');
    expect(typeof controller.create).toBe('function');
    expect(typeof controller.update).toBe('function');
    expect(typeof controller.disable).toBe('function');
    expect(typeof controller.redeem).toBe('function');
  });

  it('exposes admin notification endpoints used by the admin notification center', () => {
    const controller = loadControllerPrototype(
      'notifications/admin-notifications.controller.ts',
      'AdminNotificationsController',
    );

    expect(typeof controller.list).toBe('function');
    expect(typeof controller.markRead).toBe('function');
    expect(typeof controller.markAllRead).toBe('function');
  });
});
