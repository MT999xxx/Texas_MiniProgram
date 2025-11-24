const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    tabs: [
      { status: 'all', label: '全部' },
      { status: 'PENDING', label: '待支付' },
      { status: 'PAID', label: '已支付' },
      { status: 'IN_PROGRESS', label: '制作中' },
      { status: 'COMPLETED', label: '已完成' },
      { status: 'CANCELLED', label: '已取消' }
    ],
    currentTab: 'all',
    orders: [],
    loading: false,
    userInfo: null,
  },

  async onLoad() {
    await this.checkLogin();
    await this.loadOrders();
  },

  async onShow() {
    await this.checkLogin();
    await this.loadOrders();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadOrders();
    wx.stopPullDownRefresh();
  },

  // 检查登录状态
  async checkLogin() {
    const isLoggedIn = await authManager.checkLogin();
    if (!isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '查看订单记录需要登录，是否前往登录？',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/order-list/index')
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
    this.loadOrders();
  },

  // 加载订单列表
  async loadOrders() {
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
        url: '/orders',
        method: 'GET',
        data: params
      });

      // 处理数据格式
      const orders = list.map(item => ({
        ...item,
        orderNumber: this.generateOrderNumber(item.id, item.createdAt),
        statusText: this.getStatusText(item.status),
        createdAtText: this.formatDateTime(item.createdAt),
        totalQuantity: item.items.reduce((sum, i) => sum + i.quantity, 0),
      }));

      this.setData({
        orders,
        loading: false
      });

    } catch (error) {
      console.error('加载订单列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 生成订单号
  generateOrderNumber(id, createdAt) {
    const date = new Date(createdAt);
    const dateStr = date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const shortId = id.slice(-6).toUpperCase();
    return `${dateStr}${shortId}`;
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      PENDING: '待支付',
      PAID: '已支付',
      IN_PROGRESS: '制作中',
      COMPLETED: '已完成',
      CANCELLED: '已取消'
    };
    return statusMap[status] || status;
  },

  // 格式化时间
  formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `今天 ${hours}:${minutes}`;
    } else if (days === 1) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `昨天 ${hours}:${minutes}`;
    } else {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hours}:${minutes}`;
    }
  },

  // 查看订单详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    });
  },

  // 取消订单
  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id === id);

    if (!order) {
      return;
    }

    wx.showModal({
      title: '确认取消',
      content: `确定要取消订单吗？取消后将退还库存。`,
      confirmText: '确认取消',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.doCancelOrder(id);
        }
      }
    });
  },

  // 执行取消订单
  async doCancelOrder(id) {
    try {
      wx.showLoading({ title: '取消中...' });

      await request({
        url: `/orders/${id}/status`,
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
        this.loadOrders();
      }, 1000);

    } catch (error) {
      wx.hideLoading();
      console.error('取消订单失败:', error);
      wx.showToast({
        title: '取消失败',
        icon: 'none'
      });
    }
  },

  // 支付订单
  async payOrder(e) {
    const id = e.currentTarget.dataset.id;
    const PaymentUtils = require('../../utils/payment');

    try {
      const result = await PaymentUtils.createOrderPayment(id, {
        successCallback: () => {
          wx.showToast({ title: '支付成功', icon: 'success' });
          setTimeout(() => this.loadOrders(), 1500);
        },
        failCallback: (error) => {
          if (!error.cancelled) {
            wx.showToast({ title: '支付失败', icon: 'none' });
          }
        },
      });

      console.log('支付结果:', result);
    } catch (error) {
      console.error('支付失败:', error);
      wx.showToast({ title: '支付失败', icon: 'none' });
    }
  },

  // 联系客服
  contactService(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '客服功能开发中',
      icon: 'none'
    });
  },

  // 再来一单
  reorder(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id === id);

    if (!order) {
      return;
    }

    wx.showModal({
      title: '再来一单',
      content: '将重复之前的订单，是否继续？',
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          // 跳转到菜单页面，携带订单信息
          const items = order.items.map(item => ({
            id: item.menuItem.id,
            name: item.menuItem.name,
            price: item.menuItem.price,
            quantity: item.quantity
          }));

          wx.navigateTo({
            url: `/pages/menu/index?reorder=${encodeURIComponent(JSON.stringify(items))}`
          });
        }
      }
    });
  },

  // 去点餐
  gotoMenu() {
    wx.switchTab({
      url: '/pages/menu/index'
    });
  }
});