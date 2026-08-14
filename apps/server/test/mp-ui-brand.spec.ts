import fs from 'fs';
import path from 'path';

const mpRoot = path.join(__dirname, '../../mp');
const adminRoot = path.join(__dirname, '../../admin/src');

const readMp = (file: string) => fs.readFileSync(path.join(mpRoot, file), 'utf8');
const readAdmin = (file: string) => fs.readFileSync(path.join(adminRoot, file), 'utf8');

describe('Set baR customer UI brand contract', () => {
  it('repairs stale production login instead of persisting mock members', () => {
    const auth = readMp('utils/auth.js');

    expect(auth).toContain('isProductionApi()');
    expect(auth).toContain('throw apiError');
    expect(auth).toContain('自动修复模拟登录失败');
  });

  it('uses Set baR in primary customer-facing entry points', () => {
    const files = [
      'app.json',
      'pages/home/index.wxml',
      'pages/home/index.js',
      'pages/menu/index.wxml',
      'pages/table/index.wxml',
      'pages/login/index.wxml',
      'pages/ranking/index.wxml',
    ];

    for (const file of files) {
      expect(readMp(file)).toContain('Set baR');
    }
  });

  it('keeps Set baR as the brand and removes old English hero copy', () => {
    const home = readMp('pages/home/index.wxml');

    expect(home).toContain('Set baR');
    expect(home).not.toContain('night-panel');
    expect(home).not.toMatch(/BLACK PANTHER NIGHT|The Night Starts Here|Cocktails, poker tables|OPEN TONIGHT/);
  });

  it('uses the black panther hero asset for the redesigned home surface', () => {
    expect(readMp('pages/home/index.wxml')).toContain('/images/setbar-panther-hero.jpg');
  });

  it('uses the new Texas poker table asset instead of the old horse table', () => {
    const table = readMp('pages/table/index.wxml');
    const tableJs = readMp('pages/table/index.js');

    expect(table).toContain('/images/setbar-poker-table.jpg');
    expect(tableJs).toContain('/images/setbar-poker-table.jpg');
    expect(table).not.toContain('/images/table_bg.jpg');
  });

  it('maps old table names to the new dining table labels', () => {
    const tableJs = readMp('pages/table/index.js');

    expect(tableJs).toContain('function normalizeTableDisplayName');
    expect(tableJs).toContain("'高额桌': '高级餐桌'");
    expect(tableJs).toContain("'低额桌': '中级餐桌'");
    expect(tableJs).toContain('normalizeTableDisplayName(mainTable.name');
    expect(tableJs).toContain('normalizeTableDisplayName(sideTable.name');
  });

  it('uses the new local icon system for primary navigation', () => {
    const tabBar = readMp('components/tab-bar/index.js');

    expect(tabBar).toContain('/images/icons/home-muted.svg');
    expect(tabBar).toContain('/images/icons/tables-muted.svg');
    expect(tabBar).toContain('/images/icons/rank-muted.svg');
    expect(tabBar).toContain('/images/icons/me-muted.svg');
    expect(tabBar).not.toMatch(/Home|Tables|Rank|Me/);
    expect(tabBar).not.toMatch(/shouye2\.jpg|zhuomian2\.jpg|paihangbang2\.jpg|huiyuan2\.jpg/);
  });

  it('removes emoji and css-drawn shortcut icons from primary entry points', () => {
    const content = [
      readMp('pages/home/index.wxml'),
      readMp('pages/menu/index.wxml'),
    ].join('\n');

    expect(content).not.toMatch(/css-icon-container|icon-shape-food|icon-shape-table|css-cart-icon/);
  });

  it('removes the old AAA club label from primary customer screens', () => {
    const files = [
      'pages/home/index.wxml',
      'pages/menu/index.wxml',
      'pages/table/index.wxml',
      'pages/login/index.wxml',
      'pages/ranking/index.wxml',
    ];

    for (const file of files) {
      const content = readMp(file);
      expect(content).not.toMatch(/AAA CLUB|Triple A Club/);
    }
  });

  it('keeps primary customer templates Chinese-only outside the Set baR brand', () => {
    const files = [
      'pages/home/index.wxml',
      'pages/menu/index.wxml',
      'pages/table/index.wxml',
      'pages/login/index.wxml',
      'pages/ranking/index.wxml',
      'pages/member/index.wxml',
      'pages/reservation/index.wxml',
      'pages/events/index.wxml',
      'pages/coupons/index.wxml',
      'pages/order-list/index.wxml',
      'pages/order-detail/index.wxml',
    ];

    const content = files.map(readMp).join('\n');
    expect(content).not.toMatch(/POKER|COCKTAIL|OPEN TONIGHT|ORDER TO|Leaderboard|Welcome Back|Step into Set baR|MODERN NOIR|VIP CLUB|PRO LEAGUE|PRIVILEGE|EXCLUSIVE|FESTIVAL|ENROLLED|ENTRY:|PRIZE:|LIMITED|WALK-IN|COUPON|ORDER AT|NO\./);
  });

  it('keeps voucher purchase in ordering and removes member-center voucher purchase', () => {
    const memberWxml = readMp('pages/member/index.wxml');
    const memberJs = readMp('pages/member/index.js');
    const menuJs = readMp('pages/menu/index.js');

    expect(menuJs).toContain('voucherEligible');
    expect(memberWxml).not.toContain('voucher-modal');
    expect(memberJs).not.toContain('purchaseWineVoucher');
    expect(memberJs).not.toContain('monthly-free-flow');
  });

  it('opens owned coupons from member center as the voucher display surface', () => {
    const memberJs = readMp('pages/member/index.js');
    const couponsJs = readMp('pages/coupons/index.js');

    expect(memberJs).toContain("url: '/pages/coupons/index?tab=AVAILABLE'");
    expect(memberJs).not.toContain('getWineVoucherPackages()');
    expect(couponsJs).toContain("const request = require('../../utils/request');");
    expect(couponsJs).not.toContain("const { request } = require('../../utils/request');");
  });

  it('shows member point deposit and withdraw records from the member center', () => {
    const coinsApi = readMp('api/coins.js');
    const memberJs = readMp('pages/member/index.js');
    const memberWxml = readMp('pages/member/index.wxml');

    expect(coinsApi).toContain('function getPointRecords(memberId)');
    expect(coinsApi).toContain('url: `/coins/points/records/${memberId}`');
    expect(memberJs).toContain('loadPointRecords');
    expect(memberJs).toContain('showPointRecordsPopup');
    expect(memberWxml).toContain('存取分记录');
    expect(memberWxml).toContain('pointRecords');
  });

  it('does not expose internal member UID on the customer member center', () => {
    const memberWxml = readMp('pages/member/index.wxml');

    expect(memberWxml).not.toContain('UID');
    expect(memberWxml).not.toContain('userInfo.id');
    expect(memberWxml).not.toContain('user-id-badge');
  });

  it('offers wine voucher redemption from owned coupons', () => {
    const couponsJs = readMp('pages/coupons/index.js');
    const couponsWxml = readMp('pages/coupons/index.wxml');

    expect(couponsJs).toContain('loadWineVoucherRedeemOptions');
    expect(couponsJs).toContain('redeemWineVoucher');
    expect(couponsJs).not.toContain('voucherBatchId: this.data.selectedWineVoucher');
    expect(couponsWxml).toContain('bindtap="redeemWineVoucher"');
    expect(couponsWxml).not.toContain('bindtap="useCoupon"');
  });

  it('shows full voucher validity time and remembers the selected delivery table', () => {
    const couponsJs = readMp('pages/coupons/index.js');
    const couponsWxml = readMp('pages/coupons/index.wxml');
    const couponsCss = readMp('pages/coupons/index.wxss');

    expect(couponsJs).toContain('开始 ${this.formatDateTime(userCoupon.startTime)}');
    expect(couponsJs).toContain('到期 ${this.formatDateTime(userCoupon.endTime)}');
    expect(couponsJs).toContain('REDEEM_TABLE_STORAGE_KEY');
    expect(couponsJs).toContain('wx.setStorageSync(REDEEM_TABLE_STORAGE_KEY');
    expect(couponsCss).toContain('white-space: pre-line');
    expect(couponsWxml).toContain('scroll-y class="redeem-option-scroll"');
    expect(couponsWxml).toContain('class="redeem-action-panel"');
    expect(couponsCss).toContain('.redeem-action-panel');
    expect(couponsCss).toContain('flex-shrink: 0');
  });

  it('shows location and wifi status on the home page', () => {
    const appJson = JSON.parse(readMp('app.json'));
    const homeJs = readMp('pages/home/index.js');
    const homeWxml = readMp('pages/home/index.wxml');

    expect(appJson.requiredPrivateInfos).toContain('getLocation');
    expect(appJson.permission?.['scope.userLocation']?.desc).toBeTruthy();
    expect(homeJs).toContain('wx.getLocation');
    expect(homeJs).toContain('wx.getConnectedWifi');
    expect(homeWxml).toContain('{{locationText}}');
    expect(homeWxml).toContain('{{wifiText}}');
  });

  it('shows item bonus points on menu cards using the 50x order rule', () => {
    const menuJs = readMp('pages/menu/index.js');
    const menuWxml = readMp('pages/menu/index.wxml');
    const menuCss = readMp('pages/menu/index.wxss');

    expect(menuJs).toContain('const POINTS_PER_ORDER_YUAN = 50');
    expect(menuJs).toContain('calculateOrderBonusPoints(item.price');
    expect(menuWxml).toContain('goods-bonus');
    expect(menuWxml).toContain('赠{{item.bonusPoints}}积分');
    expect(menuCss).toContain('.goods-bonus');
  });

  it('shows tournament voucher bonus points only for rebuy products', () => {
    const menuJs = readMp('pages/menu/index.js');

    expect(menuJs).toContain('const MONTHLY_REBUY_WINE_VOUCHER_BONUS_POINTS = 15000');
    expect(menuJs).toContain('const WEEKLY_REBUY_WINE_VOUCHER_BONUS_POINTS = 10000');
    expect(menuJs).toContain("name.includes('月赛')");
    expect(menuJs).toContain("name.includes('周赛')");
    expect(menuJs).toContain("normalizedName.includes('sng')");
    expect(menuJs).toContain('return isRebuy ? MONTHLY_REBUY_WINE_VOUCHER_BONUS_POINTS : 0');
    expect(menuJs).toContain('return isRebuy ? WEEKLY_REBUY_WINE_VOUCHER_BONUS_POINTS : 0');
  });

  it('shows 10000 bonus points for the daily rebuy voucher', () => {
    const menuJs = readMp('pages/menu/index.js');

    expect(menuJs).toContain('const DAILY_REBUY_WINE_VOUCHER_BONUS_POINTS = 10000');
    expect(menuJs).toContain("name.includes('日常赛') && isRebuy");
    expect(menuJs).toContain('wineVoucherBonusPoints: getWineVoucherItemBonusPoints(item)');
  });

  it('maps wine voucher payment in the admin order detail', () => {
    const orders = readAdmin('pages/Orders/index.tsx');

    expect(orders).toContain('wine_voucher');
    expect(orders).toContain('\u9152\u5238\u652f\u4ed8');
  });

  it('shows original price and wine voucher discount in mini-program order detail', () => {
    const detailJs = readMp('pages/order-detail/index.js');
    const detailWxml = readMp('pages/order-detail/index.wxml');

    expect(detailJs).toContain('formatOrderPricing(order)');
    expect(detailJs).toContain("order.paymentMethod === 'wine_voucher'");
    expect(detailJs).toContain("discountLabel: isWineVoucher ? '酒券抵扣' : '尊享折扣'");
    expect(detailWxml).toContain('order.displayOriginalAmount');
    expect(detailWxml).toContain('order.displayDiscountAmount');
    expect(detailWxml).toContain('order.displayPayAmount');
    expect(detailWxml).toContain('order.paymentMethodText');
  });

  it('uses real admin notification APIs instead of mock notification data', () => {
    const notificationCenter = readAdmin('components/NotificationCenter/index.tsx');

    expect(notificationCenter).toContain('adminNotificationsApi');
    expect(notificationCenter).toContain('duration: 5');
    expect(notificationCenter).not.toContain('mockNotifications');
  });

  it('does not repeatedly popup the same admin order notification', () => {
    const notificationCenter = readAdmin('components/NotificationCenter/index.tsx');

    expect(notificationCenter).toContain('SHOWN_POPUP_STORAGE_KEY');
    expect(notificationCenter).toContain('getPopupDedupeKey');
    expect(notificationCenter).toContain('localStorage.setItem');
    expect(notificationCenter).toContain('displayedPopupIds.current.add(popupKey)');
    expect(notificationCenter).not.toContain('displayedPopupIds.current.delete(freshOrder.id)');
  });

  it('plays a one-time admin sound for new orders and point withdrawals', () => {
    const notificationCenter = readAdmin('components/NotificationCenter/index.tsx');

    expect(notificationCenter).toContain('playAdminNotificationSound');
    expect(notificationCenter).toContain('AudioContext');
    expect(notificationCenter).toContain("item.type === 'ORDER'");
    expect(notificationCenter).toContain("item.sourceType === 'point_withdraw'");
    expect(notificationCenter).toContain('displayedSoundIds');
    expect(notificationCenter).toContain('persistDisplayedSoundIds');
  });

  it('docks the custom tab bar and reserves safe-area space on tab pages', () => {
    const tabBarCss = readMp('components/tab-bar/index.wxss');
    const tabPageCss = [
      readMp('pages/home/index.wxss'),
      readMp('pages/table/index.wxss'),
      readMp('pages/ranking/index.wxss'),
      readMp('pages/member/index.wxss'),
    ].join('\n');

    expect(tabBarCss).toContain('left: 0');
    expect(tabBarCss).toContain('right: 0');
    expect(tabBarCss).toContain('bottom: 0');
    expect(tabBarCss).toContain('env(safe-area-inset-bottom)');
    expect(tabBarCss).not.toContain('left: 24rpx');
    expect(tabBarCss).not.toContain('right: 24rpx');
    expect(tabBarCss).not.toContain('bottom: calc(18rpx + env(safe-area-inset-bottom))');
    expect(tabPageCss).toContain('--setbar-tabbar-space');
    expect(tabPageCss).toContain('env(safe-area-inset-bottom)');
  });

  it('keeps the home hero actions in adaptive flow instead of a fixed vertical offset', () => {
    const homeCss = readMp('pages/home/index.wxss');

    expect(homeCss).toContain('display: flex');
    expect(homeCss).toContain('margin-top: auto');
    expect(homeCss).not.toContain('margin-top: 650rpx');
  });

  it('keeps the menu cart reserve tight so the product list does not look finished early', () => {
    const menuCss = readMp('pages/menu/index.wxss');
    const menuWxml = readMp('pages/menu/index.wxml');

    expect(menuCss).toContain('display: flex');
    expect(menuCss).toContain('flex-direction: column');
    expect(menuCss).toContain('height: 0');
    expect(menuCss).toContain('min-height: 0');
    expect(menuWxml).toContain("sidebar {{cartCount > 0 ? 'has-cart' : ''}}");
    expect(menuWxml).toContain("goods-list {{cartCount > 0 ? 'has-cart' : ''}}");
    expect(menuCss).toContain('.goods-list.has-cart');
    expect(menuCss).toContain('.sidebar.has-cart');
    expect(menuCss).toContain('padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom))');
    expect(menuCss).toContain('padding-bottom: calc(154rpx + env(safe-area-inset-bottom))');
    expect(menuCss).not.toContain('220rpx');
    expect(menuCss).not.toContain('padding: 40rpx 0');
    expect(menuCss).toContain('bottom: calc(22rpx + env(safe-area-inset-bottom))');
  });

  it('confirms coin recharge settlement before showing success and refreshing balance', () => {
    const memberJs = readMp('pages/member/index.js');

    expect(memberJs).toContain("const PaymentUtils = require('../../utils/payment');");
    expect(memberJs).toContain('PaymentUtils.pollPaymentStatus(paymentId');
    expect(memberJs).toContain('if (result.isPaid)');
    expect(memberJs).toContain('入账确认中');
    expect(memberJs).toContain('到账560金币（赠60）· 赠送30000积分');
    expect(memberJs).toContain('到账1150金币（赠150）· 赠送80000积分');
    expect(memberJs).toContain('到账2400金币（赠400）· 赠送200000积分');
    expect(memberJs).toContain('到账6000金币（赠1000）· 赠送600000积分');
    expect(memberJs).not.toContain('即使查询失败也显示成功');
  });

  it('shows V1 through V10 membership rewards with local generated badges', () => {
    const levelJs = readMp('pages/member-level/index.js');
    const levelWxml = readMp('pages/member-level/index.wxml');

    expect(levelJs).toContain("code: 'V10'");
    expect(levelJs).toContain("name: '最强尊主'");
    expect(levelJs).toContain('threshold: 70000');
    expect(levelJs).toContain('/images/membership/v1.jpg');
    expect(levelJs).toContain('/images/membership/v10.jpg');
    expect(levelWxml).not.toContain('累计充值');
    expect(levelJs).not.toContain('累计充值');
    expect(levelWxml).toContain('class="level-indicators"');
    expect(levelWxml).toContain('管理员确认后到账');
  });

  it('uses the new V1 through V10 identity on member center and ranking', () => {
    const levelMap = readMp('utils/membership-levels.js');
    const memberJs = readMp('pages/member/index.js');
    const memberWxml = readMp('pages/member/index.wxml');
    const rankingJs = readMp('pages/ranking/index.js');
    const rankingWxml = readMp('pages/ranking/index.wxml');

    expect(levelMap).toContain("code: 'V1', level: 1, name: '尊荣白银'");
    expect(levelMap).toContain("code: 'V10', level: 10, name: '最强尊主'");
    expect(memberJs).toContain('getMembershipLevel(res.levelCode)');
    expect(memberJs).not.toContain("'memberInfo.levelName': res.levelName");
    expect(memberWxml).toContain('memberInfo.levelIcon');
    expect(rankingJs).toContain('getMembershipLevel(item.levelCode)');
    expect(rankingWxml).toContain('item.levelIcon');
    expect(rankingWxml).toContain('item.levelCode');
  });

  it('does not treat uncertain payment status as a successful paid result', () => {
    const paymentUtils = readMp('utils/payment.js');

    expect(paymentUtils).toContain('uncertain: true');
    expect(paymentUtils).toMatch(/success:\s*false,[\s\S]*uncertain:\s*true/);
    expect(paymentUtils).not.toMatch(/success:\s*true,[\s\S]*支付完成，请稍后刷新查看结果/);
  });
});
