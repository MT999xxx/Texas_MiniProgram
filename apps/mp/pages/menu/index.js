const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    categories: [],
    menuItems: [],
    currentCategory: '',
    scrollIntoView: '',
    cart: {}, // { itemId: count }
    totalCount: 0,
    totalPrice: 0,
    originalPrice: 0, // 原价
    discountAmount: 0, // 优惠金额
    showCartModal: false,
    cartItems: [], // 购物车商品列表
    loading: true,
    isLoggedIn: false,
    isGuest: false,
    userInfo: null,
    selectedCoupon: null, // 选中的优惠券
    availableCoupons: [], // 可用优惠券
    showCouponModal: false
  },

  async onLoad(options) {
    await this.checkLoginStatus();

    // 检查是否有传递的优惠券信息
    const app = getApp();
    if (app.globalData.selectedCoupon) {
      this.setData({ selectedCoupon: app.globalData.selectedCoupon });
      // 清除全局数据
      app.globalData.selectedCoupon = null;
    }

    // 处理再来一单功能
    if (options.reorder) {
      try {
        const reorderItems = JSON.parse(decodeURIComponent(options.reorder));
        this.handleReorderItems(reorderItems);
      } catch (error) {
        console.error('解析再来一单数据失败:', error);
      }
    }

    await this.loadCategories();
    await this.loadMenuItems();

    // 如果已登录，加载可用优惠券
    if (this.data.isLoggedIn) {
      await this.loadAvailableCoupons();
    }
  },

  // 处理再来一单商品
  handleReorderItems(reorderItems) {
    wx.showModal({
      title: '再来一单',
      content: `将为您添加${reorderItems.length}个商品到购物车`,
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          const cart = {};
          reorderItems.forEach(item => {
            cart[item.id] = item.quantity;
          });

          this.setData({ cart });
          this.updateCartSummary();

          wx.showToast({
            title: '商品已添加到购物车',
            icon: 'success'
          });
        }
      }
    });
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const isGuest = wx.getStorageSync('guestMode');
    const userInfo = authManager.userInfo;
    this.setData({ isLoggedIn, isGuest, userInfo });

    // 如果登录状态改变，重新加载可用优惠券
    if (isLoggedIn) {
      await this.loadAvailableCoupons();
    }
  },

  // 加载可用优惠券
  async loadAvailableCoupons() {
    if (!this.data.userInfo || !this.data.userInfo.id) {
      return;
    }

    try {
      const coupons = await request({
        url: `/coupons/my-coupons/${this.data.userInfo.id}`,
        method: 'GET',
        data: { status: 'AVAILABLE' }
      });

      // 过滤可用的优惠券
      const availableCoupons = coupons.filter(coupon => {
        const now = new Date();
        const endTime = new Date(coupon.endTime);
        return endTime > now;
      });

      this.setData({ availableCoupons });
    } catch (error) {
      console.error('加载可用优惠券失败:', error);
    }
  },

  // 加载分类列表
  async loadCategories() {
    try {
      const categories = await request({
        url: '/menu/categories',
        method: 'GET'
      });

      this.setData({
        categories,
        currentCategory: categories.length > 0 ? categories[0].id : ''
      });
    } catch (error) {
      console.error('加载分类失败:', error);
      wx.showToast({
        title: '加载分类失败',
        icon: 'none'
      });
    }
  },

  // 加载菜品列表
  async loadMenuItems() {
    try {
      const items = await request({
        url: '/menu/items',
        method: 'GET'
      });

      // 按分类组织菜品
      const categoryMap = {};
      const { categories } = this.data;

      // 初始化分类
      categories.forEach(cat => {
        categoryMap[cat.id] = {
          categoryId: cat.id,
          categoryName: cat.name,
          items: []
        };
      });

      // 分配菜品到对应分类
      items.forEach(item => {
        const categoryId = item.category?.id;
        if (categoryId && categoryMap[categoryId]) {
          categoryMap[categoryId].items.push(item);
        }
      });

      const menuItems = Object.values(categoryMap).filter(cat => cat.items.length > 0);

      this.setData({
        menuItems,
        loading: false
      });
    } catch (error) {
      console.error('加载菜品失败:', error);
      wx.showToast({
        title: '加载菜品失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 选择分类
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      currentCategory: categoryId,
      scrollIntoView: `cat-${categoryId}`
    });
  },

  // 增加商品
  increaseItem(e) {
    const { id, price, name } = e.currentTarget.dataset;
    const { cart } = this.data;

    cart[id] = (cart[id] || 0) + 1;

    this.setData({ cart });
    this.updateCartSummary();

    wx.vibrateShort(); // 触觉反馈
  },

  // 减少商品
  decreaseItem(e) {
    const { id } = e.currentTarget.dataset;
    const { cart } = this.data;

    if (cart[id] > 0) {
      cart[id]--;
      if (cart[id] === 0) {
        delete cart[id];
      }
    }

    this.setData({ cart });
    this.updateCartSummary();
  },

  // 更新购物车汇总
  updateCartSummary() {
    const { cart, menuItems, selectedCoupon } = this.data;
    let totalCount = 0;
    let originalPrice = 0;
    const cartItems = [];

    // 创建商品ID到商品信息的映射
    const itemMap = {};
    menuItems.forEach(category => {
      category.items.forEach(item => {
        itemMap[item.id] = item;
      });
    });

    // 计算总数和原价
    Object.keys(cart).forEach(itemId => {
      const count = cart[itemId];
      const item = itemMap[itemId];

      if (item && count > 0) {
        totalCount += count;
        originalPrice += item.price * count;
        cartItems.push({
          id: itemId,
          name: item.name,
          price: item.price,
          count
        });
      }
    });

    // 计算优惠券折扣
    let discountAmount = 0;
    let finalPrice = originalPrice;

    if (selectedCoupon && originalPrice > 0) {
      discountAmount = this.calculateCouponDiscount(selectedCoupon, originalPrice);
      finalPrice = Math.max(0, originalPrice - discountAmount);
    }

    this.setData({
      totalCount,
      originalPrice: originalPrice.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      totalPrice: finalPrice.toFixed(2),
      cartItems
    });
  },

  // 计算优惠券折扣金额
  calculateCouponDiscount(coupon, orderAmount) {
    if (!coupon || !coupon.coupon) {
      return 0;
    }

    const couponInfo = coupon.coupon;

    // 检查最低消费要求
    if (couponInfo.minAmount && orderAmount < couponInfo.minAmount) {
      return 0;
    }

    switch (couponInfo.type) {
      case 'AMOUNT':
        // 满减券
        return Math.min(couponInfo.value, orderAmount);

      case 'DISCOUNT':
        // 折扣券 (例如：8折，value为0.8)
        return orderAmount * (1 - couponInfo.value);

      case 'PERCENTAGE':
        // 百分比折扣 (例如：20%折扣，value为20)
        return orderAmount * (couponInfo.value / 100);

      default:
        return 0;
    }
  },

  // 显示购物车详情
  showCart() {
    if (this.data.totalCount > 0) {
      this.setData({ showCartModal: true });
    }
  },

  // 隐藏购物车详情
  hideCart() {
    this.setData({ showCartModal: false });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止冒泡
  },

  // 显示优惠券选择modal
  showCouponModal() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (this.data.availableCoupons.length === 0) {
      wx.showToast({
        title: '暂无可用优惠券',
        icon: 'none'
      });
      return;
    }

    this.setData({ showCouponModal: true });
  },

  // 隐藏优惠券选择modal
  hideCouponModal() {
    this.setData({ showCouponModal: false });
  },

  // 选择优惠券
  selectCoupon(e) {
    const couponId = e.currentTarget.dataset.id;
    const coupon = this.data.availableCoupons.find(c => c.id === couponId);

    if (coupon) {
      // 检查是否满足使用条件
      const minAmount = coupon.coupon?.minAmount || 0;
      if (minAmount > 0 && this.data.originalPrice < minAmount) {
        wx.showToast({
          title: `需满${minAmount}元才能使用`,
          icon: 'none'
        });
        return;
      }

      this.setData({
        selectedCoupon: coupon,
        showCouponModal: false
      });
      this.updateCartSummary();

      wx.showToast({
        title: '优惠券已选择',
        icon: 'success'
      });
    }
  },

  // 取消选择优惠券
  unselectCoupon() {
    this.setData({ selectedCoupon: null });
    this.updateCartSummary();
  },

  // 清空购物车
  clearCart() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            cart: {},
            totalCount: 0,
            totalPrice: 0,
            cartItems: [],
            showCartModal: false
          });
        }
      }
    });
  },

  // 去结算
  async checkout() {
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '下单功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const app = getApp();
            const currentPage = getCurrentPages().pop();
            const currentRoute = currentPage ? `/${currentPage.route}` : '/pages/menu/index';
            app.requireLogin(currentRoute);
          }
        }
      });
      return;
    }

    // 游客模式提示
    if (this.data.isGuest) {
      wx.showToast({
        title: '游客模式无法下单',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const { cartItems, totalPrice } = this.data;

    if (cartItems.length === 0) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认下单',
      content: `共${cartItems.length}件商品，总计￥${totalPrice}`,
      success: async (res) => {
        if (res.confirm) {
          await this.createOrder();
        }
      }
    });
  },

  // 创建订单
  async createOrder() {
    const { cartItems, selectedCoupon } = this.data;

    try {
      wx.showLoading({ title: '提交订单中...' });

      // 构造订单数据
      const orderItems = cartItems.map(item => ({
        menuItemId: item.id,
        quantity: item.count,
        price: item.price
      }));

      const orderData = {
        items: orderItems,
        note: '',
        originalAmount: parseFloat(this.data.originalPrice),
        finalAmount: parseFloat(this.data.totalPrice),
        discountAmount: parseFloat(this.data.discountAmount)
      };

      // 如果已登录，添加会员ID
      if (this.data.userInfo && this.data.userInfo.id) {
        orderData.memberId = this.data.userInfo.id;
      }

      // 如果有选择优惠券，添加优惠券信息
      if (selectedCoupon) {
        orderData.userCouponId = selectedCoupon.id;
      }

      const order = await request({
        url: '/orders',
        method: 'POST',
        data: orderData
      });

      wx.hideLoading();

      // 下单成功
      wx.showToast({
        title: '下单成功',
        icon: 'success'
      });

      // 清空购物车和优惠券选择
      this.setData({
        cart: {},
        totalCount: 0,
        totalPrice: 0,
        originalPrice: 0,
        discountAmount: 0,
        cartItems: [],
        selectedCoupon: null,
        showCartModal: false
      });

      // 刷新可用优惠券列表（因为可能使用了一张）
      if (this.data.isLoggedIn) {
        await this.loadAvailableCoupons();
      }

      // 跳转到订单详情页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/order-detail/index?id=${order.id}`,
          fail: () => {
            // 如果页面不存在，跳转到订单列表
            wx.navigateTo({
              url: '/pages/order-list/index'
            });
          }
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('下单失败:', error);

      let errorMessage = '下单失败，请重试';
      if (error.message.includes('优惠券')) {
        errorMessage = '优惠券使用失败';
        // 重新加载可用优惠券
        if (this.data.isLoggedIn) {
          await this.loadAvailableCoupons();
        }
        // 清除选中的优惠券
        this.setData({ selectedCoupon: null });
        this.updateCartSummary();
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadCategories();
    await this.loadMenuItems();
    wx.stopPullDownRefresh();
  }
});