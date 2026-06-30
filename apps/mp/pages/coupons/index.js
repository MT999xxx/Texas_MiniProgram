const request = require('../../utils/request');
const authManager = require('../../utils/auth');
const wineVoucherOptionsApi = require('../../api/wineVoucherOptions');
const tableApi = require('../../api/table');

Page({
  data: {
    tabs: [
      { status: 'available', label: '可领取' },
      { status: 'AVAILABLE', label: '可使用' },
      { status: 'USED', label: '已使用' },
      { status: 'EXPIRED', label: '已过期' }
    ],
    currentTab: 'available',
    currentTabLabel: '可领取',
    coupons: [],
    loading: false,
    userInfo: null,
    showRedeemPopup: false,
    selectedWineVoucher: null,
    redeemOptions: [],
    tables: [],
    selectedRedeemOptionId: '',
    selectedTableId: '',
    redeeming: false
  },

  async onLoad(options = {}) {
    if (options.tab) {
      this.setCurrentTab(options.tab);
    }
    await this.checkLogin();
    await this.loadCoupons();
  },

  async onShow() {
    await this.checkLogin();
    await this.loadCoupons();
  },

  async onPullDownRefresh() {
    await this.loadCoupons();
    wx.stopPullDownRefresh();
  },

  setCurrentTab(status) {
    const target = this.data.tabs.find(t => t.status === status);
    if (!target) return;
    this.setData({
      currentTab: target.status,
      currentTabLabel: target.label
    });
  },

  async checkLogin() {
    const isLoggedIn = await authManager.checkLogin();
    if (!isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '查看优惠券需要登录，是否前往登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/coupons/index')
            });
          } else {
            wx.navigateBack({
              fail: () => wx.switchTab({ url: '/pages/home/index' })
            });
          }
        }
      });
      return false;
    }

    this.setData({ userInfo: authManager.userInfo });
    return true;
  },

  switchTab(e) {
    const status = e.currentTarget.dataset.status;
    const currentTabLabel = this.data.tabs.find(t => t.status === status)?.label || '';
    this.setData({ currentTab: status, currentTabLabel });
    this.loadCoupons();
  },

  async loadCoupons() {
    if (!this.data.userInfo || !this.data.userInfo.id) {
      return;
    }

    this.setData({ loading: true });

    try {
      let coupons = [];

      if (this.data.currentTab === 'available') {
        coupons = await request({
          url: '/coupons/available',
          method: 'GET',
          data: { memberId: this.data.userInfo.id }
        });

        coupons = coupons.map(item => ({
          ...item,
          validityText: this.formatValidityPeriod(item),
          canClaim: this.canClaimCoupon(item),
          claimText: this.getClaimButtonText(item)
        }));
      } else {
        coupons = await request({
          url: `/coupons/my-coupons/${this.data.userInfo.id}`,
          method: 'GET',
          data: { status: this.data.currentTab }
        });

        coupons = coupons.map(item => ({
          ...item,
          statusText: this.getStatusText(item.status),
          validityText: this.formatCouponValidity(item),
          usedAtText: item.usedAt ? this.formatDateTime(item.usedAt) : '',
          actionText: item.kind === 'WINE_VOUCHER' ? '兑换' : '去使用'
        }));
      }

      this.setData({ coupons, loading: false });
    } catch (error) {
      console.error('加载优惠券列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  canClaimCoupon(coupon) {
    const now = new Date();
    const startTime = new Date(coupon.startTime);
    const endTime = new Date(coupon.endTime);
    const userLevel = this.data.userInfo?.level?.level || 1;
    if (startTime > now || endTime < now) return false;
    if (coupon.claimedQuantity >= coupon.totalQuantity) return false;
    if (coupon.minMemberLevel && userLevel < coupon.minMemberLevel) return false;
    return true;
  },

  getClaimButtonText(coupon) {
    if (coupon.claimedQuantity >= coupon.totalQuantity) return '已领完';
    const userLevel = this.data.userInfo?.level?.level || 1;
    if (coupon.minMemberLevel && userLevel < coupon.minMemberLevel) {
      return `需V${coupon.minMemberLevel}`;
    }
    const now = new Date();
    if (new Date(coupon.startTime) > now) return '未开始';
    if (new Date(coupon.endTime) < now) return '已过期';
    return '立即领取';
  },

  getStatusText(status) {
    const statusMap = {
      AVAILABLE: '可使用',
      USED: '已使用',
      EXPIRED: '已过期'
    };
    return statusMap[status] || status;
  },

  formatValidityPeriod(coupon) {
    if (coupon.validDays) {
      return `领取后${coupon.validDays}天内有效`;
    }
    return `${this.formatDate(coupon.startTime)} - ${this.formatDate(coupon.endTime)}`;
  },

  formatCouponValidity(userCoupon) {
    return `${this.formatDate(userCoupon.startTime)} - ${this.formatDate(userCoupon.endTime)}`;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  },

  formatDateTime(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  },

  async claimCoupon(e) {
    const id = e.currentTarget.dataset.id;
    const coupon = this.data.coupons.find(c => c.id === id);
    if (!coupon || !coupon.canClaim) return;

    try {
      wx.showLoading({ title: '领取中' });
      await request({
        url: `/coupons/${id}/claim`,
        method: 'POST',
        data: { memberId: this.data.userInfo.id }
      });
      wx.hideLoading();
      wx.showToast({ title: '领取成功', icon: 'success' });
      setTimeout(() => this.loadCoupons(), 800);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '领取失败', icon: 'none' });
    }
  },

  useCoupon(e) {
    const id = e.currentTarget.dataset.id;
    const userCoupon = this.data.coupons.find(c => c.id === id);
    if (!userCoupon || userCoupon.status !== 'AVAILABLE') return;

    wx.showModal({
      title: '使用优惠券',
      content: '是否前往点餐使用此优惠券？',
      confirmText: '去点餐',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/menu/index',
            success: () => {
              const app = getApp();
              app.globalData.selectedCoupon = userCoupon;
            }
          });
        }
      }
    });
  },

  openCouponUse(e) {
    this.useCoupon(e);
  },

  async loadWineVoucherRedeemOptions() {
    const [redeemOptions, tables] = await Promise.all([
      wineVoucherOptionsApi.listActive(),
      tableApi.getStatus()
    ]);

    this.setData({
      redeemOptions: redeemOptions || [],
      tables: (tables || []).filter(table => table.isActive !== false)
    });
  },

  async redeemWineVoucher(e) {
    const id = e.currentTarget.dataset.id;
    const voucher = this.data.coupons.find(c => c.id === id);
    if (!voucher || voucher.status !== 'AVAILABLE') return;

    this.setData({
      selectedWineVoucher: voucher,
      selectedRedeemOptionId: '',
      selectedTableId: '',
      showRedeemPopup: true
    });

    try {
      wx.showLoading({ title: '加载兑换项' });
      await this.loadWineVoucherRedeemOptions();
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  closeRedeemPopup() {
    if (this.data.redeeming) return;
    this.setData({ showRedeemPopup: false });
  },

  stopBubble() {},

  selectRedeemOption(e) {
    this.setData({ selectedRedeemOptionId: e.currentTarget.dataset.id });
  },

  selectRedeemTable(e) {
    this.setData({ selectedTableId: e.currentTarget.dataset.id });
  },

  async confirmRedeemWineVoucher() {
    if (this.data.redeeming) return;
    if (!this.data.selectedRedeemOptionId) {
      wx.showToast({ title: '请选择兑换酒品', icon: 'none' });
      return;
    }
    if (!this.data.selectedTableId) {
      wx.showToast({ title: '请选择桌位', icon: 'none' });
      return;
    }

    this.setData({ redeeming: true });
    wx.showLoading({ title: '兑换中' });

    try {
      const result = await wineVoucherOptionsApi.redeem(this.data.selectedRedeemOptionId, {
        memberId: this.data.userInfo.id,
        tableId: this.data.selectedTableId,
        voucherBatchId: this.data.selectedWineVoucher?.voucherBatchId || undefined
      });

      wx.hideLoading();
      this.setData({ redeeming: false, showRedeemPopup: false });
      await this.loadCoupons();

      wx.showModal({
        title: '兑换成功',
        content: '酒品订单已创建，后台会按桌位出品。',
        confirmText: '查看订单',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm && result?.order?.id) {
            wx.navigateTo({ url: `/pages/order-detail/index?id=${result.order.id}` });
          }
        }
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ redeeming: false });
      wx.showToast({ title: error.message || '兑换失败', icon: 'none' });
    }
  },

  gotoAvailable() {
    this.setData({ currentTab: 'available', currentTabLabel: '可领取' });
    this.loadCoupons();
  }
});
