const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    totalPoints: 0,
    monthlyEarned: 0,
    monthlyUsed: 0,
    filterTabs: [
      { label: '全部', value: 'all' },
      { label: '获得', value: 'EARNED' },
      { label: '使用', value: 'USED' }
    ],
    currentTab: 'all',
    transactions: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    refreshing: false,
    showRulesModal: false,
    showExchangeModal: false,
    exchangeItems: [
      { id: '1', name: '5元代金券', description: '全场通用', points: 500 },
      { id: '2', name: '10元代金券', description: '全场通用', points: 1000 },
      { id: '3', name: '特调鸡尾酒', description: '限量款', points: 800 },
      { id: '4', name: '德州扑克筹码', description: '纪念版', points: 1500 },
      { id: '5', name: '会员升级券', description: '直升一级', points: 2000 }
    ],
    isLoggedIn: false,
    isGuest: false
  },

  async onLoad() {
    await this.checkLoginStatus();
    if (!this.data.isLoggedIn) {
      // 未登录，显示登录提示
      this.showLoginTip();
      return;
    }
    await this.loadPointsSummary();
    await this.loadTransactions();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const isGuest = wx.getStorageSync('guestMode');
    this.setData({ isLoggedIn, isGuest });
  },

  // 显示登录提示
  showLoginTip() {
    wx.showModal({
      title: '需要登录',
      content: '查看积分信息需要登录，是否前往登录？',
      confirmText: '去登录',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/points/index')
          });
        } else {
          wx.switchTab({
            url: '/pages/home/index'
          });
        }
      }
    });
  },

  // 加载积分汇总
  async loadPointsSummary() {
    try {
      // 调用后端接口获取积分汇总
      // 暂时使用模拟数据
      const summary = {
        totalPoints: 1280,
        monthlyEarned: 350,
        monthlyUsed: 100
      };

      /* 实际接口示例：
      const summary = await request({
        url: '/loyalty/summary',
        method: 'GET'
      });
      */

      this.setData(summary);
    } catch (error) {
      console.error('加载积分汇总失败:', error);
    }
  },

  // 加载积分明细
  async loadTransactions(append = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { page, pageSize, currentTab } = this.data;

      // 调用后端接口
      const params = {
        page,
        pageSize
      };

      if (currentTab !== 'all') {
        params.type = currentTab;
      }

      // 模拟数据
      const mockTransactions = this.getMockTransactions(page);

      /* 实际接口示例：
      const result = await request({
        url: '/loyalty/transactions',
        method: 'GET',
        data: params
      });
      const transactions = result.data;
      */

      const transactions = mockTransactions.map(item => ({
        ...item,
        formattedDate: this.formatDate(item.createdAt),
        statusText: item.type === 'EARNED' ? '已到账' : '已使用'
      }));

      this.setData({
        transactions: append ? [...this.data.transactions, ...transactions] : transactions,
        hasMore: transactions.length === pageSize,
        loading: false,
        refreshing: false
      });
    } catch (error) {
      console.error('加载积分明细失败:', error);
      this.setData({
        loading: false,
        refreshing: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 获取模拟数据
  getMockTransactions(page) {
    const types = ['EARNED', 'USED'];
    const descriptions = {
      EARNED: ['消费获得', '签到奖励', '活动奖励', '邀请好友', '预约奖励'],
      USED: ['兑换商品', '抵扣消费', '参与活动']
    };

    const now = Date.now();
    const transactions = [];

    for (let i = 0; i < 20; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const descList = descriptions[type];

      transactions.push({
        id: `${page}-${i}`,
        type,
        description: descList[Math.floor(Math.random() * descList.length)],
        amount: Math.floor(Math.random() * 100) + 10,
        createdAt: new Date(now - i * 86400000 - page * 86400000 * 20).toISOString()
      });
    }

    return transactions;
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      const hours = Math.floor(diff / 3600000);
      if (hours === 0) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab,
      page: 1,
      transactions: []
    });
    this.loadTransactions();
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;

    this.setData({
      page: this.data.page + 1
    });
    this.loadTransactions(true);
  },

  // 下拉刷新
  async onRefresh() {
    this.setData({
      refreshing: true,
      page: 1
    });
    await this.loadPointsSummary();
    await this.loadTransactions();
  },

  // 显示规则
  showRules() {
    this.setData({ showRulesModal: true });
  },

  // 隐藏规则
  hideRules() {
    this.setData({ showRulesModal: false });
  },

  // 显示兑换
  showExchange() {
    // 游客模式检查
    if (this.data.isGuest) {
      wx.showModal({
        title: '功能受限',
        content: '游客模式无法兑换商品，请登录后使用',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('guestMode');
            wx.navigateTo({
              url: '/pages/login/index'
            });
          }
        }
      });
      return;
    }

    this.setData({ showExchangeModal: true });
  },

  // 隐藏兑换
  hideExchange() {
    this.setData({ showExchangeModal: false });
  },

  // 阻止冒泡
  stopPropagation() {},

  // 兑换商品
  async exchangeItem(e) {
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.exchangeItems.find(i => i.id === itemId);

    if (!item) return;

    wx.showModal({
      title: '确认兑换',
      content: `确定用${item.points}积分兑换${item.name}吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.doExchange(item);
        }
      }
    });
  },

  // 执行兑换
  async doExchange(item) {
    try {
      wx.showLoading({ title: '兑换中...' });

      // 调用兑换接口
      /* 实际接口示例：
      await request({
        url: '/loyalty/exchange',
        method: 'POST',
        data: {
          itemId: item.id,
          points: item.points
        }
      });
      */

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      wx.hideLoading();
      wx.showToast({
        title: '兑换成功',
        icon: 'success'
      });

      // 更新积分
      this.setData({
        totalPoints: this.data.totalPoints - item.points,
        showExchangeModal: false
      });

      // 刷新积分明细
      this.setData({ page: 1 });
      await this.loadTransactions();

    } catch (error) {
      wx.hideLoading();
      console.error('兑换失败:', error);
      wx.showToast({
        title: '兑换失败',
        icon: 'none'
      });
    }
  },

  // 跳转排行榜
  navigateToRanking() {
    wx.navigateTo({
      url: '/pages/ranking/index'
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.onRefresh();
    wx.stopPullDownRefresh();
  }
});