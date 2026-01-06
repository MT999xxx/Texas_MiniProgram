// pages/menu/index.js
const menuApi = require('../../api/menu');
const authManager = require('../../utils/auth');

Page({
  data: {
    categories: [],
    currentCategory: 0,
    goodsList: [],
    cart: {}, // 购物车 { itemId: quantity }
    cartItems: [], // 购物车商品列表（用于显示）
    cartCount: 0, // 购物车总数量
    cartAmount: 0, // 购物车总金额
    showCart: false, // 是否显示购物车详情
    loading: false,
  },

  /**
   * 页面加载
   */
  onLoad(options) {
    this.loadCategories();
    this.loadCartFromStorage();
  },

  /**
   * 页面显示
   */
  onShow() {
    // 从缓存恢复购物车
    this.loadCartFromStorage();
  },

  /**
   * 加载分类列表
   */
  async loadCategories() {
    try {
      const categories = await menuApi.getCategories();

      if (categories && categories.length > 0) {
        this.setData({ categories });
        // 加载第一个分类的商品
        this.loadMenuItems(categories[0].id);
      } else {
        console.log('未找到分类数据');
        this.setData({ categories: [], goodsList: [] });
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      // 获取更详细的错误信息
      const errorMsg = error.message || (typeof error === 'string' ? error : '加载分类失败');
      wx.showToast({ title: errorMsg, icon: 'none' });

      // 如果没有任何分类，尝试展示一个空状态或者引导刷新
      if (!this.data.categories.length) {
        this.setData({ loading: false });
      }
    }
  },

  /**
   * 加载菜单商品
   */
  async loadMenuItems(categoryId) {
    this.setData({ loading: true });

    try {
      const items = await menuApi.getGoods(categoryId);

      this.setData({
        goodsList: items || [],
        loading: false,
      });
    } catch (error) {
      console.error('加载商品失败:', error);
      this.setData({ loading: false });

      // Fallback Mock
      if (!this.data.goodsList.length) {
        this.setData({
          goodsList: [
            { id: 101, categoryId, name: '特调鸡尾酒', price: 68, description: '微醺时刻，独家特调', imageUrl: '/images/zhuomian2.png' },
            { id: 102, categoryId, name: '炸薯条', price: 28, description: '外酥里嫩，经典搭配', imageUrl: '/images/zhuomian2.png' }
          ]
        });
      }
    }
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    const categoryId = this.data.categories[index]?.id;

    this.setData({ currentCategory: index });

    if (categoryId) {
      this.loadMenuItems(categoryId);
    }
  },

  /**
   * 加入购物车
   */
  addToCart(e) {
    const { id, name, price } = e.currentTarget.dataset;
    const cart = { ...this.data.cart };

    // 增加数量
    if (cart[id]) {
      cart[id].quantity += 1;
    } else {
      cart[id] = {
        id,
        name,
        price,
        quantity: 1,
      };
    }

    this.updateCart(cart);

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1000,
    });
  },

  /**
   * 减少购物车商品数量
   */
  reduceCartItem(e) {
    const { id } = e.currentTarget.dataset;
    const cart = { ...this.data.cart };

    if (cart[id]) {
      cart[id].quantity -= 1;

      if (cart[id].quantity <= 0) {
        delete cart[id];
      }
    }

    this.updateCart(cart);
  },

  /**
   * 增加购物车商品数量
   */
  increaseCartItem(e) {
    const { id } = e.currentTarget.dataset;
    const cart = { ...this.data.cart };

    if (cart[id]) {
      cart[id].quantity += 1;
    }

    this.updateCart(cart);
  },

  /**
   * 删除购物车商品
   */
  removeCartItem(e) {
    const { id } = e.currentTarget.dataset;
    const cart = { ...this.data.cart };

    delete cart[id];
    this.updateCart(cart);
  },

  /**
   * 更新购物车
   */
  updateCart(cart) {
    let count = 0;
    let amount = 0;
    const cartItems = [];

    Object.keys(cart).forEach(id => {
      const item = cart[id];
      count += item.quantity;
      amount += item.price * item.quantity;
      cartItems.push({
        id,
        name: item.name,
        price: item.price,
        count: item.quantity
      });
    });

    this.setData({
      cart,
      cartItems,
      cartCount: count,
      cartAmount: amount, // keep as number for calc
    });

    // 保存到缓存
    wx.setStorageSync('menu_cart', cart);
  },

  /**
   * 从缓存加载购物车
   */
  loadCartFromStorage() {
    try {
      const cart = wx.getStorageSync('menu_cart') || {};
      this.updateCart(cart);
    } catch (error) {
      console.error('加载购物车失败:', error);
    }
  },

  /**
   * 清空购物车
   */
  clearCart() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateCart({});
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      },
    });
  },

  /**
   * 显示/隐藏购物车详情
   */
  toggleCart() {
    if (this.data.cartCount > 0) {
      this.setData({ showCart: !this.data.showCart });
    }
  },

  /**
   * 隐藏购物车详情
   */
  hideCart() {
    this.setData({ showCart: false });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡到父元素
  },

  /**
   * 减少购物车商品（购物车详情中）
   */
  decreaseCart(e) {
    const { id } = e.currentTarget.dataset;
    const cart = { ...this.data.cart };

    if (cart[id]) {
      cart[id].quantity -= 1;

      if (cart[id].quantity <= 0) {
        delete cart[id];
      }
    }

    this.updateCart(cart);
  },

  /**
   * 增加购物车商品（购物车详情中）
   */
  increaseCart(e) {
    const { id } = e.currentTarget.dataset;
    const cart = { ...this.data.cart };

    if (cart[id]) {
      cart[id].quantity += 1;
    }

    this.updateCart(cart);
  },

  /**
   * 去结算
   */
  async checkout() {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    // 隐藏购物车详情
    this.setData({ showCart: false });

    // 调用提交订单
    await this.submitOrder();
  },

  /**
   * 提交订单
   */
  async submitOrder() {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    // 检查登录状态
    const isLoggedIn = await authManager.checkLogin();
    if (!isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '下单需要先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/index' });
          }
        },
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 组装订单商品
      const items = Object.values(this.data.cart).map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      // 创建订单
      const order = await menuApi.submitOrder({
        items,
        totalAmount: this.data.cartAmount,
        note: '',
      });

      this.setData({ loading: false });

      // 询问是否立即支付
      wx.showModal({
        title: '下单成功',
        content: `订单金额：￥${this.data.cartAmount.toFixed(2)}\n是否立即支付？`,
        confirmText: '立即支付',
        cancelText: '稍后支付',
        success: async (res) => {
          if (res.confirm) {
            // 调用真实支付
            const PaymentUtils = require('../../utils/payment');
            try {
              const result = await PaymentUtils.createOrderPayment(order.id, {
                successCallback: () => {
                  this.clearCartAndNavigate();
                },
                failCallback: (err) => {
                  if (!err.cancelled) {
                    wx.showToast({ title: err.message || '支付失败', icon: 'none' });
                  }
                },
              });
            } catch (error) {
              console.error('支付失败:', error);
              // 即使支付失败，订单已创建，可以稍后支付
              this.clearCartAndNavigate();
            }
          } else {
            // 稍后支付，跳转到订单列表
            this.clearCartAndNavigate();
          }
        },
      });
    } catch (error) {
      this.setData({ loading: false });
      console.error('下单失败:', error);
      wx.showToast({ title: error.message || '下单失败', icon: 'none' });
    }
  },

  /**
   * 清空购物车并跳转
   */
  clearCartAndNavigate() {
    // 清空购物车
    this.updateCart({});

    // 跳转到订单列表 (假设有这个页面，或者留在当前页)
    // wx.navigateTo({ url: '/pages/order-list/index' });
    wx.showToast({ title: '订单已提交', icon: 'success' });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    const categoryId = this.data.categories[this.data.currentCategory]?.id;
    if (categoryId) {
      this.loadMenuItems(categoryId).then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },
});