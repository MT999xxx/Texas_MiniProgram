'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertReceiptIsPrintable,
  displayWidth,
  formatReceipt,
} = require('../src/receipt');

test('formats the test receipt as exactly three compact rows', () => {
  const receipt = formatReceipt({
    tableName: '打印测试桌',
    paymentMethod: 'wechat_pay',
    totalAmount: 116,
    items: [
      { name: '长岛冰茶', quantity: 1 },
      { name: '夏日海洋（无酒精）', quantity: 1 },
    ],
  });

  assert.deepEqual(receipt.split('\n'), [
    '测试桌 ￥116',
    'x1长岛冰茶',
    'x1夏日海洋',
  ]);
  assert.doesNotThrow(() => assertReceiptIsPrintable(receipt));
  for (const line of receipt.split('\n')) {
    assert.ok(displayWidth(line) <= 16, `line is wider than 16 columns: ${line}`);
  }
});

test('shows only two items and marks remaining item count', () => {
  const receipt = formatReceipt({
    tableName: '酒桌3',
    totalAmount: 188,
    items: [
      { name: '商品一', quantity: 1 },
      { name: '商品二', quantity: 2 },
      { name: '商品三', quantity: 1 },
      { name: '商品四', quantity: 3 },
    ],
  });

  const lines = receipt.split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[2], /\+2$/);
});

test('blocks mojibake before raw bytes are sent to the printer', () => {
  assert.throws(
    () => assertReceiptIsPrintable('锟斤拷'),
    /小票包含乱码/,
  );
});
