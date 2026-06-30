# Wine Voucher Redemption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Set baR wine voucher redemption from customer voucher inventory into paid operational orders with admin-configured redeemable wines and real admin notifications.

**Architecture:** Keep wine voucher purchase in the menu, keep "我的优惠券" as inventory display and redemption entry, and create a dedicated redemption path that consumes voucher batches transactionally. Add admin-configured redemption options backed by existing menu items and a separate admin notification store for operational unread notifications.

**Tech Stack:** NestJS, TypeORM, MySQL migrations, React/Vite/Ant Design admin, WeChat mini-program WXML/JS/WXSS, Jest contract tests.

---

### Task 1: Contract Tests First

**Files:**
- Modify: `apps/server/test/api-contract.spec.ts`
- Modify: `apps/server/test/setbar-loyalty-rules.spec.ts`
- Modify: `apps/server/test/mp-ui-brand.spec.ts`

- [ ] **Step 1: Add failing route and UI contract tests**

Add tests that assert:

- `WineVoucherOptionsController` exposes create/list/update/delete/redeem methods.
- `AdminNotificationsController` exposes list, mark read, and mark all read methods.
- `OrdersService` references `paymentMethod = 'wine_voucher'`.
- Admin order page maps `wine_voucher` to `酒券支付`.
- Mini-program member page does not contain "酒券购买" modal copy.
- Mini-program coupon page contains "兑换" for wine vouchers.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm.cmd --filter server test -- test/api-contract.spec.ts test/setbar-loyalty-rules.spec.ts test/mp-ui-brand.spec.ts
```

Expected: FAIL because the new controllers/entities/methods and UI copy do not exist yet.

### Task 2: Backend Entities and Migrations

**Files:**
- Create: `apps/server/src/coins/wine-voucher-redeem-option.entity.ts`
- Create: `apps/server/src/coins/wine-voucher-redeem-item.entity.ts`
- Create: `apps/server/src/coins/wine-voucher-redemption.entity.ts`
- Create: `apps/server/src/notifications/admin-notification.entity.ts`
- Create: `apps/server/src/migrations/1732530000000-AddWineVoucherRedemptionAndAdminNotifications.ts`
- Modify: `apps/server/data-source.ts`

- [ ] **Step 1: Add entity tests or contract references**

Use Task 1 tests to force entity exports and route availability.

- [ ] **Step 2: Implement minimal entities**

Add redemption option, option item, redemption audit, and admin notification entities with explicit table names and TypeORM relations.

- [ ] **Step 3: Add migration**

Create tables:

- `wine_voucher_redeem_options`
- `wine_voucher_redeem_items`
- `wine_voucher_redemptions`
- `admin_notifications`

- [ ] **Step 4: Register entities**

Add the new entities to `apps/server/data-source.ts` and relevant modules.

### Task 3: Backend Voucher Option and Redemption Services

**Files:**
- Create: `apps/server/src/coins/wine-voucher-options.controller.ts`
- Create: `apps/server/src/coins/wine-voucher-options.service.ts`
- Create: `apps/server/src/coins/dto/wine-voucher-option.dto.ts`
- Modify: `apps/server/src/coins/coins.module.ts`
- Modify: `apps/server/src/orders/orders.module.ts`
- Modify: `apps/server/src/orders/orders.service.ts`

- [ ] **Step 1: Add failing behavior test**

Add tests showing redemption consumes a batch and creates an order with `status = PAID`, `paymentMethod = wine_voucher`, `totalAmount = 0`, and discount equal to original amount.

- [ ] **Step 2: Implement option CRUD**

Admin can create, list, update, and disable redemption options. Mini-program list returns only active options with active menu items.

- [ ] **Step 3: Implement redemption transaction**

In one database transaction:

- select valid voucher batch by expiry.
- decrement `remainingQuantity`.
- decrement menu stock.
- create order and order items.
- create redemption audit.
- create admin notification.

- [ ] **Step 4: Keep legacy voucher compatibility**

Existing legacy `member.wineVouchers` remains display fallback only. New redemption should prefer voucher batches.

### Task 4: Backend Admin Notifications

**Files:**
- Create: `apps/server/src/notifications/admin-notifications.module.ts`
- Create: `apps/server/src/notifications/admin-notifications.controller.ts`
- Create: `apps/server/src/notifications/admin-notifications.service.ts`
- Modify: `apps/server/src/modules/app.module.ts`
- Modify: `apps/server/src/orders/orders.service.ts`

- [ ] **Step 1: Add failing notification test**

Assert successful voucher redemption creates an unread `ORDER` notification with source id equal to the created order id.

- [ ] **Step 2: Implement notification persistence**

Add service methods `createOrderNotification`, `list`, `markRead`, `markAllRead`.

- [ ] **Step 3: Wire voucher redemption to notifications**

Call notification creation after successful order creation in the same transaction when possible.

### Task 5: Admin API and UI

**Files:**
- Create: `apps/admin/src/api/wineVoucherOptions.ts`
- Create: `apps/admin/src/api/adminNotifications.ts`
- Create or modify: admin voucher config page under `apps/admin/src/pages`
- Modify: `apps/admin/src/components/NotificationCenter/index.tsx`
- Modify: `apps/admin/src/components/NotificationCenter/NotificationCenter.css`
- Modify: `apps/admin/src/pages/Orders/index.tsx`

- [ ] **Step 1: Add API wrappers**

Add typed API wrappers for voucher options and admin notifications.

- [ ] **Step 2: Replace notification mock data**

Fetch notifications from backend, poll every 10-15 seconds, mark read on click, mark all read through API.

- [ ] **Step 3: Add 5 second popup**

When a new unread order notification appears, show a small popup/notification for 5 seconds and then close automatically.

- [ ] **Step 4: Add voucher option management**

Admin can configure active options from existing menu items. Keep UI compact and consistent with current admin dark theme.

- [ ] **Step 5: Fix payment method labels**

Map `wine_voucher` to `酒券支付` in order details.

### Task 6: Mini-Program UI and API

**Files:**
- Modify: `apps/mp/api/coins.js`
- Create or modify: `apps/mp/api/wineVoucherOptions.js`
- Modify: `apps/mp/pages/member/index.js`
- Modify: `apps/mp/pages/member/index.wxml`
- Modify: `apps/mp/pages/member/index.wxss`
- Modify: `apps/mp/pages/coupons/index.js`
- Modify: `apps/mp/pages/coupons/index.wxml`
- Modify: `apps/mp/pages/coupons/index.wxss`

- [ ] **Step 1: Remove member purchase modal**

The member page "兑换" entry should navigate to `pages/coupons/index?tab=AVAILABLE`, not open wine voucher purchase.

- [ ] **Step 2: Repair coupon page copy and markup**

Replace mojibake text and fix broken WXML tags.

- [ ] **Step 3: Add redemption action**

Wine voucher cards show "兑换". Tapping loads active redemption options and table list, then submits `POST /wine-voucher-options/:id/redeem`.

- [ ] **Step 4: Add user feedback**

Show loading, success, and failure toasts/modal. On success, navigate or offer to view order details.

### Task 7: Verification

**Files:**
- No production changes unless tests reveal a defect.

- [ ] **Step 1: Static checks**

Run:

```powershell
git diff --check
```

- [ ] **Step 2: JS syntax checks**

Run:

```powershell
node -c apps\mp\pages\coupons\index.js
node -c apps\mp\pages\member\index.js
node -c apps\mp\api\coins.js
```

- [ ] **Step 3: Contract tests**

Run:

```powershell
pnpm.cmd --filter server test -- test/api-contract.spec.ts test/setbar-loyalty-rules.spec.ts test/mp-ui-brand.spec.ts
```

- [ ] **Step 4: Builds**

Run:

```powershell
pnpm.cmd --filter server build
pnpm.cmd --filter admin build
```

