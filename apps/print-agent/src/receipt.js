'use strict';

// The HPRT D41 label used on site reliably fits three compact text rows.
const LINE_WIDTH = 16;
const MAX_VISIBLE_ITEMS = 2;
const MOJIBAKE_PATTERN = /[锟斤拷鈥鍩绉鐨]/;

function displayWidth(value) {
  return Array.from(String(value)).reduce(
    (width, char) => width + (char.charCodeAt(0) > 0x7f ? 2 : 1),
    0,
  );
}

function truncate(value, width) {
  let result = '';
  let current = 0;
  for (const char of Array.from(String(value ?? ''))) {
    const charWidth = char.charCodeAt(0) > 0x7f ? 2 : 1;
    if (current + charWidth > width) break;
    result += char;
    current += charWidth;
  }
  return result;
}

function compactMoney(value) {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function compactItem(item) {
  const quantity = Math.max(0, Number(item.quantity || 0));
  const quantityText = `x${quantity}`;
  const rawName = String(item.name || '商品')
    .replace(/[（(][^）)]*[）)]/g, '')
    .trim();
  const nameWidth = Math.max(4, LINE_WIDTH - displayWidth(quantityText));
  return `${quantityText}${truncate(rawName, nameWidth)}`;
}

function compactHeader(tableName, totalAmount) {
  const amountText = `￥${compactMoney(totalAmount)}`;
  const available = Math.max(
    2,
    LINE_WIDTH - displayWidth(amountText) - 1,
  );
  const shortTableName = String(tableName || '未选桌位')
    .replace(/^打印测试桌$/, '测试桌');
  return `${truncate(shortTableName, available)} ${amountText}`;
}

function formatReceipt(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenItemCount = Math.max(0, items.length - visibleItems.length);
  const lines = [compactHeader(payload.tableName, payload.totalAmount)];

  for (const item of visibleItems) lines.push(compactItem(item));

  if (hiddenItemCount > 0 && lines.length > 1) {
    const suffix = `+${hiddenItemCount}`;
    const last = lines.length - 1;
    lines[last] = `${truncate(lines[last], LINE_WIDTH - displayWidth(suffix) - 1)} ${suffix}`;
  }

  while (lines.length < 3) lines.push('');
  return lines.slice(0, 3).join('\n');
}

function assertReceiptIsPrintable(text) {
  const match = String(text || '').match(MOJIBAKE_PATTERN);
  if (match) {
    throw new Error(`小票包含乱码“${match[0]}”，已停止打印以避免浪费纸张`);
  }
}

module.exports = {
  LINE_WIDTH,
  MAX_VISIBLE_ITEMS,
  formatReceipt,
  assertReceiptIsPrintable,
  displayWidth,
  truncate,
};
