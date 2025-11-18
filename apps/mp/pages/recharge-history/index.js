const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    rechargeHistory: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    limit: 20,
    userInfo: null,
    isLoggedIn: false,
  },

  async onLoad() {
    await this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      await this.loadRechargeHistory();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const userInfo = authManager.userInfo;
    this.setData({ isLoggedIn, userInfo });

    if (!isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '查看充值记录需要登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/recharge-history/index')
            });
          } else {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 加载充值记录
  async loadRechargeHistory() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const result = await request({
        url: '/payment/recharge-history',
        method: 'GET',
        data: {
          page: this.data.page,
          limit: this.data.limit,
        }
      });

      const newHistory = result.data.map(record => ({
        ...record,
        statusText: this.getStatusText(record.status),
        timeText: this.formatTime(record.createdAt),
        completedTimeText: record.completedAt ? this.formatTime(record.completedAt) : null,
      }));

      this.setData({
        rechargeHistory: this.data.page === 1 ? newHistory : [...this.data.rechargeHistory, ...newHistory],
        hasMore: newHistory.length === this.data.limit,
        page: this.data.page + 1,
        loading: false,
        refreshing: false,
      });
    } catch (error) {
      console.error('加载充值记录失败:', error);

      // 如果是第一次加载，使用模拟数据
      if (this.data.page === 1) {
        const mockHistory = this.getMockHistory();
        this.setData({
          rechargeHistory: mockHistory,
          hasMore: false,
          loading: false,
          refreshing: false,
        });

        wx.showToast({
          title: '使用模拟数据',
          icon: 'none',
          duration: 1000
        });
      } else {
        this.setData({
          loading: false,
          refreshing: false,
        });

        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'PENDING': '待支付',
      'SUCCESS': '充值成功',
      'FAILED': '充值失败',
      'CANCELLED': '已取消',
    };
    return statusMap[status] || status;
  },

  // 格式化时间
  formatTime(timeString) {
    const date = new Date(timeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 获取模拟充值记录
  getMockHistory() {
    const now = new Date();
    return [
      {
        id: 'rech_001',
        package: {
          name: '畅快体验',
          price: 68.00,
          points: 700,
          bonusPoints: 150,
        },
        amount: 68.00,
        points: 700,
        bonusPoints: 150,
        status: 'SUCCESS',
        statusText: '充值成功',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
        completedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(), // 2小时前+5分钟
        timeText: this.formatTime(new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()),
        completedTimeText: this.formatTime(new Date(now.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()),
      },
      {
        id: 'rech_002',
        package: {
          name: '轻松游戏',
          price: 29.90,
          points: 300,
          bonusPoints: 50,
        },
        amount: 29.90,
        points: 300,
        bonusPoints: 50,
        status: 'SUCCESS',
        statusText: '充值成功',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
        completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(), // 1天前+3分钟
        timeText: this.formatTime(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
        completedTimeText: this.formatTime(new Date(now.getTime() - 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString()),
      },
      {
        id: 'rech_003',
        package: {
          name: 'VIP豪华包',
          price: 288.00,
          points: 3500,
          bonusPoints: 1000,
        },
        amount: 288.00,
        points: 3500,
        bonusPoints: 1000,
        status: 'SUCCESS',
        statusText: '充值成功',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天前
        completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(), // 7天前+2分钟
        timeText: this.formatTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        completedTimeText: this.formatTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString()),
      },
    ];
  },

  // 下拉刷新
  async onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true,
      refreshing: true,
    });
    await this.loadRechargeHistory();
    wx.stopPullDownRefresh();
  },

  // 触底加载更多
  async onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      await this.loadRechargeHistory();
    }
  },

  // 刷新记录
  async onRefresh() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true,
    });
    await this.loadRechargeHistory();
  },

  // 查看充值详情
  viewRechargeDetail(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = this.data.rechargeHistory.find(r => r.id === recordId);

    if (!record) return;

    const content = [
      `套餐：${record.package.name}`,
      `充值金额：¥${record.amount}`,
      `基础积分：${record.points}`,
      record.bonusPoints > 0 ? `奖励积分：${record.bonusPoints}` : '',
      `总计积分：${record.points + record.bonusPoints}`,
      `状态：${record.statusText}`,
      `创建时间：${record.timeText}`,
      record.completedTimeText ? `完成时间：${record.completedTimeText}` : '',
    ].filter(Boolean).join('\n');

    wx.showModal({
      title: '充值详情',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 继续支付（针对未支付的订单）
  async continuePay(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = this.data.rechargeHistory.find(r => r.id === recordId);

    if (!record || record.status !== 'PENDING') {
      wx.showToast({
        title: '订单状态异常',
        icon: 'none'
      });
      return;
    }

    // 跳转到支付页面或重新发起支付
    wx.showModal({
      title: '继续支付',
      content: `是否继续支付${record.package.name}套餐？`,
      confirmText: '继续支付',
      success: (res) => {
        if (res.confirm) {
          // 这里可以重新发起支付流程
          wx.showToast({
            title: '支付功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 返回充值页面
  goToRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/index'
    });
  }
});