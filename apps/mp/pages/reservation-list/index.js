const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    tabs: [
      { status: 'all', label: '全部' },
      { status: 'PENDING', label: '待确认' },
      { status: 'CONFIRMED', label: '已确认' },
      { status: 'CHECKED_IN', label: '已到店' },
      { status: 'CANCELLED', label: '已取消' }
    ],
    currentTab: 'all',
    reservations: [],
    loading: false,
    userInfo: null,
  },

  async onLoad() {
    await this.checkLogin();
    await this.loadReservations();
  },

  async onShow() {
    await this.checkLogin();
    await this.loadReservations();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadReservations();
    wx.stopPullDownRefresh();
  },

  // 检查登录状态
  async checkLogin() {
    const isLoggedIn = await authManager.checkLogin();
    if (!isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '查看预约记录需要登录，是否前往登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/reservation-list/index')
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
    this.setData({ currentTab: status });
    this.loadReservations();
  },

  // 加载预约列表
  async loadReservations() {
    if (!this.data.userInfo || !this.data.userInfo.id) {
      return;
    }

    this.setData({ loading: true });

    try {
      const params = {
        memberId: this.data.userInfo.id
      };

      if (this.data.currentTab !== 'all') {
        params.status = this.data.currentTab;
      }

      const list = await request({
        url: '/reservations',
        method: 'GET',
        data: params
      });

      // 处理数据格式
      const reservations = list.map(item => ({
        ...item,
        statusText: this.getStatusText(item.status),
        reservedAtText: this.formatDateTime(item.reservedAt),
        createdAtText: this.formatDateTime(item.createdAt),
      }));

      this.setData({
        reservations,
        loading: false
      });

    } catch (error) {
      console.error('加载预约记录失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      PENDING: '待确认',
      CONFIRMED: '已确认',
      CHECKED_IN: '已到店',
      CANCELLED: '已取消'
    };
    return statusMap[status] || status;
  },

  // 格式化时间
  formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 取消预约
  async cancelReservation(e) {
    const id = e.currentTarget.dataset.id;
    const reservation = this.data.reservations.find(r => r.id === id);

    if (!reservation) {
      return;
    }

    wx.showModal({
      title: '确认取消',
      content: `确定要取消${reservation.reservedAtText}的预约吗？`,
      confirmText: '确认取消',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.doCancelReservation(id);
        }
      }
    });
  },

  // 执行取消预约
  async doCancelReservation(id) {
    try {
      wx.showLoading({ title: '取消中...' });

      await request({
        url: `/reservations/${id}/status`,
        method: 'PATCH',
        data: {
          status: 'CANCELLED'
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '取消成功',
        icon: 'success'
      });

      // 刷新列表
      setTimeout(() => {
        this.loadReservations();
      }, 1000);

    } catch (error) {
      wx.hideLoading();
      console.error('取消预约失败:', error);
      wx.showToast({
        title: '取消失败',
        icon: 'none'
      });
    }
  },

  // 查看预约详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    // TODO: 跳转到预约详情页
    console.log('查看预约详情:', id);
  },

  // 去预约
  gotoReserve() {
    wx.navigateTo({
      url: '/pages/reservation/index'
    });
  }
});