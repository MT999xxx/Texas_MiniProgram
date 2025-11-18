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
    showCartModal: false,
    cartItems: [], // 购物车商品列表
    loading: true,
    isLoggedIn: false,
    isGuest: false
  },

  async onLoad() {
    await this.checkLoginStatus();
    await this.loadCategories();
    await this.loadMenuItems();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const isGuest = wx.getStorageSync('guestMode');
    this.setData({ isLoggedIn, isGuest });
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
    const { cart, menuItems } = this.data;
    let totalCount = 0;
    let totalPrice = 0;
    const cartItems = [];

    // 创建商品ID到商品信息的映射
    const itemMap = {};
    menuItems.forEach(category => {
      category.items.forEach(item => {
        itemMap[item.id] = item;
      });
    });

    // 计算总数和总价
    Object.keys(cart).forEach(itemId => {
      const count = cart[itemId];
      const item = itemMap[itemId];

      if (item && count > 0) {
        totalCount += count;
        totalPrice += item.price * count;
        cartItems.push({
          id: itemId,
          name: item.name,
          price: item.price,
          count
        });
      }
    });

    this.setData({
      totalCount,
      totalPrice: totalPrice.toFixed(2),
      cartItems
    });
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
    const { cartItems } = this.data;

    try {
      wx.showLoading({ title: '提交订单中...' });

      // 获取用户信息
      const userInfo = authManager.userInfo;
      if (!userInfo || !userInfo.id) {
        throw new Error('用户信息无效');
      }

      // 构造订单数据
      const orderItems = cartItems.map(item => ({
        menuItemId: item.id,
        quantity: item.count,
        price: item.price
      }));

      const orderData = {
        customerId: userInfo.id, // 使用实际的用户ID
        items: orderItems,
        note: ''
      };

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

      // 清空购物车
      this.setData({
        cart: {},
        totalCount: 0,
        totalPrice: 0,
        cartItems: [],
        showCartModal: false
      });

      // 可以跳转到订单详情页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/order-detail/index?orderId=${order.id}`
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('下单失败:', error);
      wx.showToast({
        title: '下单失败，请重试',
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