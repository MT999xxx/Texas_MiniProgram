const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    progressSteps: [],
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '订单ID无效',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    this.setData({ orderId: id });
    this.loadOrderDetail();
  },

  onShow() {
    if (this.data.orderId) {
      this.loadOrderDetail();
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadOrderDetail();
    wx.stopPullDownRefresh();
  },

  // 加载订单详情
  async loadOrderDetail() {
    this.setData({ loading: true });

    try {
      const order = await request({
        url: `/orders/${this.data.orderId}`,
        method: 'GET'
      });

      // 处理数据格式
      const processedOrder = {
        ...order,
        orderNumber: this.generateOrderNumber(order.id, order.createdAt),
        statusText: this.getStatusText(order.status),
        createdAtText: this.formatDateTime(order.createdAt),
        totalQuantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
      };

      // 生成进度步骤
      const progressSteps = this.generateProgressSteps(order);

      this.setData({
        order: processedOrder,
        progressSteps,
        loading: false
      });

    } catch (error) {
      console.error('加载订单详情失败:', error);
      this.setData({ loading: false });

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
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
      PENDING: '等待支付',
      PAID: '支付成功',
      IN_PROGRESS: '制作中',
      COMPLETED: '订单完成',
      CANCELLED: '订单已取消'
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

  // 生成进度步骤
  generateProgressSteps(order) {
    const steps = [
      {
        status: 'PENDING',
        title: '订单确认',
        completed: true,
        time: this.formatDateTime(order.createdAt)
      },
      {
        status: 'PAID',
        title: '支付完成',
        completed: ['PAID', 'IN_PROGRESS', 'COMPLETED'].includes(order.status),
        current: order.status === 'PAID',
        time: order.status === 'PAID' ? this.formatDateTime(order.updatedAt) : null
      },
      {
        status: 'IN_PROGRESS',
        title: '制作中',
        completed: ['IN_PROGRESS', 'COMPLETED'].includes(order.status),
        current: order.status === 'IN_PROGRESS',
        time: order.status === 'IN_PROGRESS' ? '预计15-30分钟' : null
      },
      {
        status: 'COMPLETED',
        title: '制作完成',
        completed: order.status === 'COMPLETED',
        current: order.status === 'COMPLETED',
        time: order.status === 'COMPLETED' ? this.formatDateTime(order.updatedAt) : null
      }
    ];

    return steps;
  },

  // 取消订单
  async cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消订单吗？取消后将退还库存。',
      confirmText: '确认取消',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.doCancelOrder();
        }
      }
    });
  },

  // 执行取消订单
  async doCancelOrder() {
    try {
      wx.showLoading({ title: '取消中...' });

      await request({
        url: `/orders/${this.data.orderId}/status`,
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

      // 重新加载详情
      setTimeout(() => {
        this.loadOrderDetail();
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
  async payOrder() {
    wx.showToast({
      title: '支付功能开发中',
      icon: 'none'
    });

    // TODO: 集成微信支付
    // 模拟支付成功
    setTimeout(async () => {
      try {
        await request({
          url: `/orders/${this.data.orderId}/status`,
          method: 'PATCH',
          data: {
            status: 'PAID'
          }
        });
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        });
        this.loadOrderDetail();
      } catch (error) {
        console.error('更新订单状态失败:', error);
      }
    }, 2000);
  },

  // 联系客服
  contactService() {
    wx.showToast({
      title: '客服功能开发中',
      icon: 'none'
    });
  },

  // 再来一单
  reorder() {
    const order = this.data.order;
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
  }
});