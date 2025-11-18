const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

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
  },

  async onLoad() {
    await this.checkLogin();
    await this.loadCoupons();
  },

  async onShow() {
    await this.checkLogin();
    await this.loadCoupons();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadCoupons();
    wx.stopPullDownRefresh();
  },

  // 检查登录状态
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
              fail: () => {
                wx.switchTab({ url: '/pages/home/index' });
              }
            });
          }
        }
      });
      return;
    }

    this.setData({ userInfo: authManager.userInfo });
  },

  // 切换标签页
  switchTab(e) {
    const status = e.currentTarget.dataset.status;
    const currentTabLabel = this.data.tabs.find(t => t.status === status)?.label || '';
    this.setData({
      currentTab: status,
      currentTabLabel
    });
    this.loadCoupons();
  },

  // 加载优惠券列表
  async loadCoupons() {
    if (!this.data.userInfo || !this.data.userInfo.id) {
      return;
    }

    this.setData({ loading: true });

    try {
      let coupons = [];

      if (this.data.currentTab === 'available') {
        // 可领取优惠券
        coupons = await request({
          url: '/coupons/available',
          method: 'GET',
          data: { memberId: this.data.userInfo.id }
        });

        // 处理可领取优惠券数据
        coupons = coupons.map(item => ({
          ...item,
          validityText: this.formatValidityPeriod(item),
          canClaim: this.canClaimCoupon(item),
          claimText: this.getClaimButtonText(item)
        }));

      } else {
        // 我的优惠券
        coupons = await request({
          url: `/coupons/my-coupons/${this.data.userInfo.id}`,
          method: 'GET',
          data: { status: this.data.currentTab }
        });

        // 处理我的优惠券数据
        coupons = coupons.map(item => ({
          ...item,
          statusText: this.getStatusText(item.status),
          validityText: this.formatCouponValidity(item),
          usedAtText: item.usedAt ? this.formatDateTime(item.usedAt) : ''
        }));
      }

      this.setData({
        coupons,
        loading: false
      });

    } catch (error) {
      console.error('加载优惠券列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 判断是否可以领取优惠券
  canClaimCoupon(coupon) {
    const now = new Date();
    const startTime = new Date(coupon.startTime);
    const endTime = new Date(coupon.endTime);
    const userLevel = this.data.userInfo?.level?.level || 1;

    // 检查时间有效性
    if (startTime > now || endTime < now) {
      return false;
    }

    // 检查库存
    if (coupon.claimedQuantity >= coupon.totalQuantity) {
      return false;
    }

    // 检查会员等级
    if (coupon.minMemberLevel && userLevel < coupon.minMemberLevel) {
      return false;
    }

    return true;
  },

  // 获取领取按钮文本
  getClaimButtonText(coupon) {
    if (coupon.claimedQuantity >= coupon.totalQuantity) {
      return '已领完';
    }

    const userLevel = this.data.userInfo?.level?.level || 1;
    if (coupon.minMemberLevel && userLevel < coupon.minMemberLevel) {
      return `需V${coupon.minMemberLevel}`;
    }

    const now = new Date();
    const startTime = new Date(coupon.startTime);
    const endTime = new Date(coupon.endTime);

    if (startTime > now) {
      return '未开始';
    }

    if (endTime < now) {
      return '已过期';
    }

    return '立即领取';
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      AVAILABLE: '可使用',
      USED: '已使用',
      EXPIRED: '已过期'
    };
    return statusMap[status] || status;
  },

  // 格式化优惠券有效期
  formatValidityPeriod(coupon) {
    const startDate = this.formatDate(coupon.startTime);
    const endDate = this.formatDate(coupon.endTime);

    if (coupon.validDays) {
      return `领取后${coupon.validDays}天内有效`;
    }

    return `${startDate} - ${endDate}`;
  },

  // 格式化用户优惠券有效期
  formatCouponValidity(userCoupon) {
    const startDate = this.formatDate(userCoupon.startTime);
    const endDate = this.formatDate(userCoupon.endTime);
    return `${startDate} - ${endDate}`;
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  },

  // 格式化日期时间
  formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  },

  // 领取优惠券
  async claimCoupon(e) {
    const id = e.currentTarget.dataset.id;
    const coupon = this.data.coupons.find(c => c.id === id);

    if (!coupon || !coupon.canClaim) {
      return;
    }

    try {
      wx.showLoading({ title: '领取中...' });

      await request({
        url: `/coupons/${id}/claim`,
        method: 'POST',
        data: {
          memberId: this.data.userInfo.id
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '领取成功',
        icon: 'success'
      });

      // 刷新列表
      setTimeout(() => {
        this.loadCoupons();
      }, 1000);

    } catch (error) {
      wx.hideLoading();
      console.error('领取优惠券失败:', error);

      let errorMessage = '领取失败';
      if (error.message.includes('已领完')) {
        errorMessage = '优惠券已被领完';
      } else if (error.message.includes('等级')) {
        errorMessage = '会员等级不足';
      } else if (error.message.includes('限领')) {
        errorMessage = '已达领取上限';
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    }
  },

  // 使用优惠券
  useCoupon(e) {
    const id = e.currentTarget.dataset.id;
    const userCoupon = this.data.coupons.find(c => c.id === id);

    if (!userCoupon || userCoupon.status !== 'AVAILABLE') {
      return;
    }

    wx.showModal({
      title: '使用优惠券',
      content: '是否前往点餐使用此优惠券？',
      confirmText: '去点餐',
      success: (res) => {
        if (res.confirm) {
          // 跳转到菜单页面，携带优惠券信息
          wx.switchTab({
            url: '/pages/menu/index',
            success: () => {
              // 通过 globalData 传递优惠券信息
              const app = getApp();
              app.globalData.selectedCoupon = userCoupon;
            }
          });
        }
      }
    });
  },

  // 前往可领取页面
  gotoAvailable() {
    this.setData({
      currentTab: 'available',
      currentTabLabel: '可领取'
    });
    this.loadCoupons();
  }
});