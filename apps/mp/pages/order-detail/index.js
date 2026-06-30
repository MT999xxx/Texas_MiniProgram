const request = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    progressSteps: [],
  },

  onLoad(options) {
    // 支持两种参数：id（订单ID）或 order_no（支付订单号，用于微信订单中心跳转）
    const { id, order_no } = options;

    if (order_no) {
      // 微信订单中心跳转，使用支付订单号查询
      this.setData({ paymentOrderNo: order_no });
      this.loadOrderByPaymentNo(order_no);
      return;
    }

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

      const processedItems = (order.items || []).map(item => ({
        ...item,
        displayAmount: this.formatMoney(this.resolveItemAmount(item))
      }));

      // 处理数据格式
      const processedOrder = {
        ...order,
        items: processedItems,
        orderNumber: this.generateOrderNumber(order.id, order.createdAt),
        statusText: this.getStatusText(order.status),
        createdAtText: this.formatDateTime(order.createdAt),
        totalQuantity: processedItems.reduce((sum, i) => sum + i.quantity, 0),
        ...this.formatOrderPricing(order),
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

  // 通过支付订单号加载订单详情（用于微信订单中心跳转）
  async loadOrderByPaymentNo(paymentOrderNo) {
    this.setData({ loading: true });

    try {
      // 先通过支付订单号查询订单ID
      const paymentInfo = await request({
        url: `/payment/order-by-trade-no/${paymentOrderNo}`,
        method: 'GET'
      });

      if (paymentInfo && paymentInfo.orderId) {
        this.setData({ orderId: paymentInfo.orderId });
        await this.loadOrderDetail();
      } else {
        throw new Error('订单不存在');
      }

    } catch (error) {
      console.error('通过支付订单号加载失败:', error);
      this.setData({ loading: false });

      wx.showToast({
        title: '订单不存在',
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

  formatOrderPricing(order) {
    const itemsAmount = this.calculateItemsAmount(order.items || []);
    const originalAmount = this.firstPositiveAmount(order.originalAmount, itemsAmount, order.totalAmount);
    const payAmount = this.toAmount(order.finalAmount ?? order.totalAmount);
    const configuredDiscount = this.toAmount(order.discountAmount ?? order.discount);
    const displayDiscount = configuredDiscount > 0
      ? configuredDiscount
      : Math.max(0, originalAmount - payAmount);
    const isWineVoucher = order.paymentMethod === 'wine_voucher';

    return {
      displayOriginalAmount: this.formatMoney(originalAmount),
      displayDiscountAmount: this.formatMoney(displayDiscount),
      displayPayAmount: this.formatMoney(payAmount),
      showDiscountAmount: displayDiscount > 0,
      discountLabel: isWineVoucher ? '酒券抵扣' : '尊享折扣',
      paymentMethodText: this.getPaymentMethodText(order.paymentMethod)
    };
  },

  calculateItemsAmount(items) {
    return items.reduce((sum, item) => sum + this.resolveItemAmount(item), 0);
  },

  resolveItemAmount(item) {
    const amount = this.toAmount(item.amount);
    if (amount > 0) return amount;

    const quantity = Number(item.quantity || 1);
    const unitPrice = this.toAmount(item.unitPrice ?? item.menuItem?.price);
    return unitPrice * quantity;
  },

  firstPositiveAmount(...values) {
    for (const value of values) {
      const amount = this.toAmount(value);
      if (amount > 0) return amount;
    }
    return 0;
  },

  toAmount(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? amount : 0;
  },

  formatMoney(value) {
    return this.toAmount(value).toFixed(2);
  },

  getPaymentMethodText(method) {
    const methodMap = {
      wine_voucher: '酒券支付',
      wechat_pay: '微信支付',
      coins: '金币支付',
      backend_confirm: '后台确认',
      '鸡尾酒优惠卷': '酒券支付'
    };
    return methodMap[method] || '';
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
    const PaymentUtils = require('../../utils/payment');

    try {
      const result = await PaymentUtils.createOrderPayment(this.data.orderId, {
        successCallback: () => {
          wx.showToast({ title: '支付成功', icon: 'success' });
          setTimeout(() => this.loadOrderDetail(), 1500);
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
