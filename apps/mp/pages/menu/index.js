// pages/menu/index.js
const menuApi = require('../../api/menu');
const authManager = require('../../utils/auth');
const PaymentUtils = require('../../utils/payment');

const POINTS_PER_ORDER_YUAN = 50;
const WINE_VOUCHER_BONUS_POINTS = 8000;

function isWineVoucherCategory(category) {
  const name = category && category.name ? category.name : '';
  return name.includes('积分加油站') || name.includes('积分商城');
}

function isNoBonusWineVoucherItem(item) {
  const name = item && item.name ? item.name : '';
  return name.includes('周赛');
}

function calculateOrderBonusPoints(price, options = {}) {
  if (options.isNoBonusWineVoucher) {
    return 0;
  }
  if (options.isWineVoucher) {
    return WINE_VOUCHER_BONUS_POINTS;
  }
  return Math.floor(Number(price || 0) * POINTS_PER_ORDER_YUAN);
}

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
    // 桌位相关
    tables: [], // 桌位列表
    selectedTableId: '', // 选中的桌位ID
    selectedTableName: '', // 选中的桌位名称
    // 规格选择相关
    showSpecDialog: false,
    specProduct: {},
    packageOptions: [
      { label: '单瓶', value: 'single', quantity: 1, priceMultiplier: 1 },
      { label: '半打', value: 'half_dozen', quantity: 6, priceMultiplier: 5.5 },
      { label: '一打', value: 'dozen', quantity: 12, priceMultiplier: 11 }
    ],
    temperatureOptions: [
      { label: '冰冻', value: 'cold' },
      { label: '常温', value: 'normal' }
    ],
    selectedPackage: 'single',
    selectedTemperature: 'cold',
    specTotalPrice: 0
  },

  /**
   * 页面加载
   */
  onLoad(options) {
    this.loadCategories();
    this.loadTables();
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

      // 处理图片 URL，确保是完整路径
      const BASE_URL = 'https://dezhoubar.xyz';
      const currentCategory = (this.data.categories || []).find(category => category.id === categoryId);
      const processedItems = (items || []).map(item => {
        let imageUrl = item.imageUrl || item.image || '';

        // 如果是相对路径，添加域名前缀
        // API返回 /api/static/uploads/... 需要完整 URL
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = BASE_URL + imageUrl;
        }

        return {
          ...item,
          imageUrl,
          bonusPoints: calculateOrderBonusPoints(item.price, {
            isWineVoucher: isWineVoucherCategory(currentCategory),
            isNoBonusWineVoucher: isNoBonusWineVoucherItem(item),
          }),
        };
      });


      this.setData({
        goodsList: processedItems,
        loading: false,
      });

    } catch (error) {
      console.error('加载商品失败:', error);
      this.setData({ loading: false });

      // Fallback Mock
      if (!this.data.goodsList.length) {
        const fallbackItems = [
          { id: 101, categoryId, name: '特调鸡尾酒', price: 68, description: '微醺时刻，独家特调', imageUrl: '/images/zhuomian2.jpg' },
          { id: 102, categoryId, name: '炸薯条', price: 28, description: '外酥里嫩，经典搭配', imageUrl: '/images/zhuomian2.jpg' }
        ].map(item => ({
          ...item,
          bonusPoints: calculateOrderBonusPoints(item.price),
        }));
        this.setData({
          goodsList: fallbackItems
        });
      }
    }
  },

  /**
   * 加载桌位列表
   */
  async loadTables() {
    // 先设置默认桌位，确保界面不会空白
    const defaultTables = [
      { id: 'table-1', name: '1号桌' },
      { id: 'table-2', name: '2号桌' },
      { id: 'table-3', name: '3号桌' },
      { id: 'table-4', name: '4号桌' },
      { id: 'table-5', name: '5号桌' }
    ];

    this.setData({ tables: defaultTables });

    try {
      const tableApi = require('../../api/table');
      const tables = await tableApi.getStatus();
      console.log('桌位API返回:', tables);

      if (tables && Array.isArray(tables) && tables.length > 0) {
        // 使用所有返回的桌位，不进行状态过滤
        this.setData({ tables: tables });
        console.log('已加载桌位:', tables.length, '个');
      } else {
        console.log('API返回桌位为空，使用默认桌位');
      }
    } catch (error) {
      console.error('加载桌位失败，使用默认桌位:', error);
    }
  },

  /**
   * 选择桌位
   */
  selectTable(e) {
    const { tableId, tableName } = e.currentTarget.dataset;
    this.setData({
      selectedTableId: tableId,
      selectedTableName: tableName
    });
    wx.showToast({ title: `已选择${tableName}`, icon: 'success', duration: 1000 });
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
    const dataset = e.currentTarget.dataset;
    const { id, name, price, imageUrl, halfDozenPrice, dozenPrice, voucherEligible } = dataset;
    const currentCategory = this.data.categories[this.data.currentCategory];

    // 判断是否是啤酒类商品，需要规格选择
    if (currentCategory && (currentCategory.name === '啤酒' || currentCategory.name.includes('啤酒'))) {
      // 显示规格选择弹窗，传入完整商品信息
      this.showSpecDialog({ id, name, price, imageUrl, halfDozenPrice, dozenPrice });
      return;
    }

    // 普通商品直接加入购物车
    const cart = { ...this.data.cart };
    // 酒卷抵扣资格：优先使用后端 voucherEligible 字段，兜底按分类名判断
    const isCocktail = voucherEligible !== undefined
      ? !!voucherEligible
      : !!(currentCategory && currentCategory.name && currentCategory.name.includes('鸡尾酒'));

    // 增加数量
    if (cart[id]) {
      cart[id].quantity += 1;
    } else {
      cart[id] = {
        id,
        name,
        price,
        quantity: 1,
        isCocktail,
      };
    }

    this.updateCart(cart);
    wx.vibrateShort({ type: 'light' });
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1000,
    });
  },

  /**
   * 显示规格选择弹窗
   */
  showSpecDialog(product) {
    // 动态计算价格（使用后端配置的价格，如果没有则用乘数计算）
    const singlePrice = parseFloat(product.price) || 0;
    const halfDozenPrice = product.halfDozenPrice ? parseFloat(product.halfDozenPrice) : (singlePrice * 5.5);
    const dozenPrice = product.dozenPrice ? parseFloat(product.dozenPrice) : (singlePrice * 11);

    const packageOptions = [
      { label: '单瓶', value: 'single', quantity: 1, totalPrice: singlePrice.toFixed(2) },
      { label: '半打', value: 'half_dozen', quantity: 6, totalPrice: halfDozenPrice.toFixed(2) },
      { label: '一打', value: 'dozen', quantity: 12, totalPrice: dozenPrice.toFixed(2) }
    ];

    this.setData({
      showSpecDialog: true,
      specProduct: { ...product, singlePrice, halfDozenPrice, dozenPrice },
      packageOptions,
      selectedPackage: 'single',
      selectedTemperature: 'cold',
      specTotalPrice: singlePrice.toFixed(2)
    });
  },

  /**
   * 隐藏规格选择弹窗
   */
  hideSpecDialog() {
    this.setData({ showSpecDialog: false });
  },

  /**
   * 选择包装规格
   */
  selectPackage(e) {
    const value = e.currentTarget.dataset.value;
    const option = this.data.packageOptions.find(item => item.value === value);

    this.setData({
      selectedPackage: value,
      specTotalPrice: option.totalPrice
    });
  },

  /**
   * 选择温度
   */
  selectTemperature(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedTemperature: value });
  },

  /**
   * 确认添加规格商品
   */
  confirmAddSpec() {
    const { specProduct, selectedPackage, selectedTemperature, specTotalPrice } = this.data;
    const packageOption = this.data.packageOptions.find(item => item.value === selectedPackage);
    const temperatureOption = this.data.temperatureOptions.find(item => item.value === selectedTemperature);

    // 生成唯一的购物车key
    const cartKey = `${specProduct.id}-${selectedPackage}-${selectedTemperature}`;
    const cart = { ...this.data.cart };

    // 组合显示名称
    const displayName = `${specProduct.name}（${packageOption.label}-${temperatureOption.label}）`;

    if (cart[cartKey]) {
      cart[cartKey].quantity += 1;
    } else {
      // 啤酒规格商品不属于鸡尾酒，无需标记
      cart[cartKey] = {
        id: specProduct.id,
        cartKey,
        name: displayName,
        basePrice: specProduct.price,
        price: parseFloat(specTotalPrice),
        quantity: 1,
        isCocktail: false,
        specs: {
          package: selectedPackage,
          packageLabel: packageOption.label,
          packageQuantity: packageOption.quantity,
          temperature: selectedTemperature,
          temperatureLabel: temperatureOption.label
        }
      };
    }

    this.updateCart(cart);
    this.hideSpecDialog();
    wx.vibrateShort({ type: 'light' });
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1000
    });
  },

  /**
   * 阻止冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡，防止点击弹窗内容区域关闭弹窗
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
      cartAmount: parseFloat(amount.toFixed(2)), // Fix floating point precision
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

    // 桌位选择验证
    if (!this.data.selectedTableId) {
      wx.showToast({
        title: '请先选择桌位',
        icon: 'none',
        duration: 2000
      });
      // 滚动到顶部，引导用户选择桌位
      wx.pageScrollTo({ scrollTop: 0, duration: 300 });
      return;
    }

    // 隐藏购物车详情
    this.setData({ showCart: false });

    // 调用提交订单
    await this.submitOrder();
  },

  /**
   * 提交订单并弹出支付选择（微信支付 / 金币支付 / 酒卷抵扣鸡尾酒后支付）
   * 酒卷规则：1张酒卷抵扣1杯鸡尾酒，按单价升序优先抵扣低价商品
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
      // 组装订单商品（包含规格类型以便后端正确计算价格）
      const items = Object.values(this.data.cart).map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        price: item.price,
        specType: item.specs?.package || 'single', // 传递规格类型：single/half_dozen/dozen
      }));

      // 获取当前用户信息
      const userInfo = authManager.getUserInfo();
      const memberId = userInfo?.id;

      // 创建订单 (包含会员ID和桌位ID)
      const order = await menuApi.submitOrder({
        items,
        totalAmount: this.data.cartAmount,
        memberId: memberId,
        tableId: this.data.selectedTableId || undefined,
        note: '',
      });

      // 获取会员金币余额和酒卷数量
      let coinBalance = 0;
      let wineVouchers = 0;
      try {
        const balanceInfo = await menuApi.getMemberBalance(memberId);
        coinBalance = Number(balanceInfo?.coins || 0);
        wineVouchers = Number(balanceInfo?.wineVouchers || 0);
      } catch (e) {
        console.log('获取余额失败:', e);
      }

      this.setData({ loading: false });

      // 酒卷抵扣计算：按单价升序取最低价的前N杯鸡尾酒（1张酒卷抵1杯）
      const cocktailPrices = Object.values(this.data.cart)
        .filter(item => item.isCocktail)
        .flatMap(item => Array(item.quantity).fill(parseFloat(item.price)))
        .sort((a, b) => a - b);
      const usableVouchers = Math.min(wineVouchers, cocktailPrices.length);
      const cocktailDiscount = parseFloat(
        cocktailPrices.slice(0, usableVouchers).reduce((s, p) => s + p, 0).toFixed(2)
      );
      const canUseVoucher = usableVouchers > 0;

      // 弹出支付方式选择
      const orderAmount = this.data.cartAmount;
      const canPayWithCoins = coinBalance >= orderAmount;

      const itemList = [
        `微信支付 ¥${orderAmount.toFixed(2)}`,
        `金币支付 ${orderAmount.toFixed(2)}金币 (余额: ${coinBalance.toFixed(2)})`,
      ];
      if (canUseVoucher) {
        const after = (orderAmount - cocktailDiscount).toFixed(2);
        itemList.push(`酒卷抵扣 -¥${cocktailDiscount.toFixed(2)}(用${usableVouchers}张) 剩余¥${after}`);
      }
      itemList.push('稍后支付');
      // 酒卷选项的 tapIndex（仅在有酒卷时才存在）
      const voucherIdx = canUseVoucher ? itemList.length - 2 : -1;

      wx.showActionSheet({
        itemList,
        success: async (res) => {
          if (res.tapIndex === 0) {
            // 微信支付全额
            try {
              await PaymentUtils.createOrderPayment(order.id, {
                successCallback: () => {
                  wx.vibrateShort({ type: 'medium' });
                  this.clearCartAndNavigate();
                },
                failCallback: (err) => {
                  if (!err.cancelled) {
                    wx.showToast({ title: err.message || '支付失败', icon: 'none' });
                  }
                },
              });
            } catch (error) {
              console.error('微信支付失败:', error);
              this.clearCartAndNavigate();
            }

          } else if (res.tapIndex === 1) {
            // 金币支付全额
            if (!canPayWithCoins) {
              wx.showModal({
                title: '金币余额不足',
                content: `当前余额${coinBalance.toFixed(2)}金币，需要${orderAmount.toFixed(2)}金币。`,
                confirmText: '去充值',
                cancelText: '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.navigateTo({ url: '/pages/recharge/index' });
                  }
                }
              });
              return;
            }
            try {
              wx.showLoading({ title: '支付中...' });
              await menuApi.payWithCoins(order.id, memberId);
              wx.hideLoading();
              wx.showToast({ title: '金币支付成功', icon: 'success' });
              this.clearCartAndNavigate();
            } catch (error) {
              wx.hideLoading();
              wx.showToast({ title: error.message || '金币支付失败', icon: 'none' });
            }

          } else if (canUseVoucher && res.tapIndex === voucherIdx) {
            // 酒卷抵扣鸡尾酒后处理剩余金额
            try {
              wx.showLoading({ title: '抵扣中...' });
              const result = await menuApi.payWithWineVouchers(
                order.id, memberId, usableVouchers, cocktailDiscount
              );
              wx.hideLoading();
              const remaining = result.remainingAmount;

              if (remaining <= 0) {
                // 全额抵扣，直接完成
                wx.vibrateShort({ type: 'medium' });
                wx.showToast({ title: '酒卷抵扣完成', icon: 'success' });
                this.clearCartAndNavigate();
              } else {
                // 剩余金额再弹出选择支付方式
                const coinEnough = coinBalance >= remaining;
                wx.showActionSheet({
                  itemList: [
                    `微信支付剩余 ¥${remaining.toFixed(2)}`,
                    `金币支付剩余 ${remaining.toFixed(2)}金币 (余额: ${coinBalance.toFixed(2)})`,
                  ],
                  success: async (res2) => {
                    if (res2.tapIndex === 0) {
                      // 微信支付剩余金额
                      try {
                        await PaymentUtils.createOrderPayment(order.id, {
                          successCallback: () => {
                            wx.vibrateShort({ type: 'medium' });
                            this.clearCartAndNavigate();
                          },
                          failCallback: (err) => {
                            if (!err.cancelled) wx.showToast({ title: err.message || '支付失败', icon: 'none' });
                          },
                        });
                      } catch (e) { this.clearCartAndNavigate(); }
                    } else {
                      // 金币支付剩余金额
                      if (!coinEnough) {
                        wx.showModal({
                          title: '金币余额不足',
                          content: `需要${remaining.toFixed(2)}金币，当前余额${coinBalance.toFixed(2)}金币`,
                          confirmText: '去充值',
                          success: (m) => { if (m.confirm) wx.navigateTo({ url: '/pages/recharge/index' }); }
                        });
                        return;
                      }
                      try {
                        wx.showLoading({ title: '支付中...' });
                        await menuApi.payWithCoins(order.id, memberId);
                        wx.hideLoading();
                        wx.showToast({ title: '支付成功', icon: 'success' });
                        this.clearCartAndNavigate();
                      } catch (e) {
                        wx.hideLoading();
                        wx.showToast({ title: e.message || '金币支付失败', icon: 'none' });
                      }
                    }
                  }
                });
              }
            } catch (error) {
              wx.hideLoading();
              wx.showToast({ title: error.message || '酒卷抵扣失败', icon: 'none' });
            }

          } else {
            // 稍后支付
            this.clearCartAndNavigate();
          }
        }
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
