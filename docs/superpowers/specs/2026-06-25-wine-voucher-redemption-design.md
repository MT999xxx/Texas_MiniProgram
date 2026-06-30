# Set baR Wine Voucher Redemption Design

## Goal

Build the corrected wine voucher flow for Set baR:

- Customers buy wine vouchers from the order menu.
- Purchased vouchers appear in "我的优惠券".
- "我的优惠券" is the display and redemption entry, not a purchase surface.
- Admins configure which wines or wine bundles each voucher can redeem.
- Redeeming a voucher creates a paid order with payment method "酒券支付".
- Admin notification center shows real order notifications and displays a 5 second popup for new orders.

## Scope

In scope:

- Backend wine voucher redemption model and APIs.
- Admin voucher redemption configuration UI.
- Mini-program voucher display and redemption UI.
- Order creation through voucher redemption.
- Admin notification persistence, list, read state, and polling popup.
- Contract tests for APIs, UI routes/copy, payment method labels, and notification wiring.

Out of scope:

- New payment provider integration.
- WebSocket/SSE real-time delivery.
- Multi-store voucher rules.
- Full coupon engine rewrite.
- Admin dashboard visual redesign outside the touched voucher and notification flows.

## Recommended Architecture

Use three backend concepts:

1. `wine_voucher_batches`: customer-owned voucher inventory. This already exists and remains the source of available, used, and expired vouchers.
2. `wine_voucher_redeem_options`: admin-configured redemption options. An option can contain one menu item or several menu items, so it supports both single bottle and package redemption.
3. `wine_voucher_redemptions`: audit records connecting member, voucher batch, option, order, and redeemed quantity.

The order system stays the source of operational fulfillment. A successful voucher redemption creates a normal `orders` row and `order_items` rows, marks the order as `PAID`, sets `payment_method = wine_voucher`, records the original wine value, applies equal discount, and leaves `totalAmount = 0`.

Admin notifications should use a new operational notification table instead of the existing public `notices` table. The existing `notices` module is for customer-facing announcements and activities; admin notification center has different lifecycle, unread state, and source links.

## Backend Contracts

### Voucher Config

- `GET /wine-voucher-options`: list active redemption options for mini-program.
- `GET /wine-voucher-options/admin`: list all options for admin.
- `POST /wine-voucher-options`: create option.
- `PATCH /wine-voucher-options/:id`: update option.
- `DELETE /wine-voucher-options/:id`: soft-disable option.

Each option contains:

- `name`: visible redemption name.
- `description`: optional visible description.
- `voucherPackageId`: package/source id from voucher purchase rules. If empty, option can be used by any wine voucher.
- `requiredVoucherCount`: usually 1.
- `items`: menu item id, quantity, spec type.
- `isActive`: whether customers can redeem it.
- `sortOrder`: display order.

### Voucher Redemption

- `POST /wine-voucher-options/:id/redeem`
- Body: `{ memberId, tableId, voucherBatchId? }`
- Behavior:
  - validates member and table.
  - validates option is active.
  - validates required voucher count is available and not expired.
  - consumes earliest-expiring matching voucher batch unless `voucherBatchId` is provided.
  - decrements menu item stock for redeemed items.
  - creates paid order with `paymentMethod = wine_voucher`.
  - writes redemption audit row.
  - writes admin notification.
  - returns `{ order, redemption }`.

### Admin Notifications

- `GET /admin-notifications?status=all|unread&limit=50`
- `PATCH /admin-notifications/:id/read`
- `PATCH /admin-notifications/read-all`

Notification fields:

- `type`: `ORDER`, `RESERVATION`, `SYSTEM`, `WARNING`.
- `title`, `content`.
- `sourceType`, `sourceId` for navigation.
- `readAt`, `createdAt`.

## Mini-Program Flow

### Menu

The existing "积分加油站" category remains the wine voucher purchase entry. When voucher products are paid successfully, the backend creates voucher batches and grants 8000 points per voucher product quantity.

### My Coupons

"我的优惠券" displays:

- normal coupons.
- wine vouchers from active `wine_voucher_batches`.
- expired and used states.

Wine voucher cards show "兑换" instead of "去使用". Tapping opens a redemption view with configured redeem options. The user selects an option and table, then confirms.

### Member Page

The current "兑换" purchase modal is removed or repurposed to navigate to "我的优惠券". Purchases happen only in the order menu.

## Admin Flow

Add a voucher configuration entry in admin near menu/order management:

- select voucher package type.
- select one or more menu items.
- set each item quantity and spec type.
- set option name, description, required voucher count, active state, and sort order.

Order detail maps payment method:

- `wechat_pay`: 微信支付
- `coins`: 金币支付
- `wine_voucher`: 酒券支付
- legacy garbled/string values: shown as 酒券支付 when they match old wine voucher strings.

Notification center fetches real backend data every 10-15 seconds. When it sees a new unread notification not already displayed in this browser session, it shows a popup for 5 seconds and then auto-closes. Clicking a notification marks it read and navigates to the relevant order detail when possible.

## Error Handling

- Expired voucher: "酒券已过期".
- Insufficient voucher quantity: "酒券数量不足".
- Inactive option: "该兑换项目已下架".
- Missing table: "请选择桌位".
- Insufficient stock: "库存不足".
- Duplicate rapid taps: front-end loading lock plus backend transactional update.

## Testing

Add/update tests for:

- voucher config routes exist.
- redemption creates paid order with `paymentMethod = wine_voucher`.
- redemption consumes voucher batch and creates audit row.
- expired vouchers cannot redeem.
- admin notifications are persisted on successful voucher order.
- admin payment method label maps `wine_voucher` to 酒券支付.
- mini-program coupon page has wine voucher redemption entry, not purchase copy.
- member page no longer buys vouchers from the redemption button.

