const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');
const PaymentUtils = require('../../utils/payment');

Page({
  data: {
    packages: [], // 充值套餐列表
    selectedPackage: null, // 选中的套餐
    userInfo: null,
    isLoggedIn: false,
    loading: false,
    paymentLoading: false,
  },

  async onLoad() {
    await this.checkLoginStatus();
    await this.loadRechargePackages();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const userInfo = authManager.userInfo;
    this.setData({ isLoggedIn, userInfo });

    if (!isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '充值需要登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/recharge/index')
            });
          } else {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 加载充值套餐
  async loadRechargePackages() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const packages = await request({
        url: '/payment/packages',
        method: 'GET',
      });

      // 处理套餐数据
      const processedPackages = packages.map(pkg => ({
        ...pkg,
        originalPrice: pkg.price,
        finalPrice: pkg.price,
        totalPoints: pkg.points + pkg.bonusPoints,
        discountPercent: pkg.bonusPoints > 0 ? Math.round(pkg.bonusPoints / pkg.points * 100) : 0,
        isRecommended: pkg.discountRate <= 0.85, // 折扣率85%以下推荐
      }));

      this.setData({
        packages: processedPackages,
        loading: false,
      });
    } catch (error) {
      console.error('加载充值套餐失败:', error);

      // 使用模拟数据
      const mockPackages = this.getMockPackages();
      this.setData({
        packages: mockPackages,
        loading: false,
      });

      wx.showToast({
        title: '使用模拟数据',
        icon: 'none',
        duration: 1000,
      });
    }
  },

  // 获取模拟充值套餐数据
  getMockPackages() {
    return [
      {
        id: 'pkg_001',
        name: '小试身手',
        description: '入门级积分套餐，适合新用户体验游戏',
        price: 9.90,
        points: 100,
        bonusPoints: 10,
        totalPoints: 110,
        discountPercent: 10,
        isRecommended: false,
      },
      {
        id: 'pkg_002',
        name: '轻松游戏',
        description: '精选积分套餐，适合日常游戏娱乐',
        price: 29.90,
        points: 300,
        bonusPoints: 50,
        totalPoints: 350,
        discountPercent: 17,
        isRecommended: false,
      },
      {
        id: 'pkg_003',
        name: '畅快体验',
        description: '热销积分套餐，游戏体验更畅快',
        price: 68.00,
        points: 700,
        bonusPoints: 150,
        totalPoints: 850,
        discountPercent: 21,
        isRecommended: true,
      },
      {
        id: 'pkg_004',
        name: '超值大礼包',
        description: '大额充值专享超值优惠',
        price: 128.00,
        points: 1500,
        bonusPoints: 400,
        totalPoints: 1900,
        discountPercent: 27,
        isRecommended: true,
      },
      {
        id: 'pkg_005',
        name: 'VIP豪华包',
        description: '尊贵VIP专属积分套餐',
        price: 288.00,
        points: 3500,
        bonusPoints: 1000,
        totalPoints: 4500,
        discountPercent: 29,
        isRecommended: true,
      },
      {
        id: 'pkg_006',
        name: '至尊王者包',
        description: '顶级积分套餐，豪华享受',
        price: 588.00,
        points: 7500,
        bonusPoints: 2500,
        totalPoints: 10000,
        discountPercent: 33,
        isRecommended: true,
      },
    ];
  },

  // 选择充值套餐
  selectPackage(e) {
    const packageId = e.currentTarget.dataset.id;
    const selectedPackage = this.data.packages.find(pkg => pkg.id === packageId);

    this.setData({
      selectedPackage: selectedPackage
    });

    // 确认充值弹窗
    const content = [
      `套餐：${selectedPackage.name}`,
      `金额：¥${selectedPackage.price}`,
      `基础积分：${selectedPackage.points}`,
      selectedPackage.bonusPoints > 0 ? `奖励积分：${selectedPackage.bonusPoints}` : '',
      `总计积分：${selectedPackage.totalPoints}`,
    ].filter(Boolean).join('\n');

    wx.showModal({
      title: '确认充值',
      content: content,
      confirmText: '确认充值',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.processPayment(selectedPackage);
        }
      }
    });
  },

  // 处理支付
  async processPayment(rechargePackage) {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (this.data.paymentLoading) return;

    this.setData({ paymentLoading: true });
    wx.showLoading({ title: '创建支付订单...' });

    try {
      // 获取用户openid
      const openid = await this.getUserOpenId();

      // 创建充值支付
      const paymentResult = await request({
        url: '/payment/recharge',
        method: 'POST',
        data: {
          memberId: this.data.userInfo.id,
          packageId: rechargePackage.id,
          paymentMethod: 'WECHAT_PAY',
          openid: openid,
        }
      });

      wx.hideLoading();

      if (paymentResult.prepayId) {
        // 调用微信支付
        await this.invokeWechatPay(paymentResult);
      } else {
        throw new Error('支付订单创建失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('充值失败:', error);

      let errorMessage = '充值失败，请重试';
      if (error.message) {
        if (error.message.includes('登录')) {
          errorMessage = '登录状态已失效，请重新登录';
        } else if (error.message.includes('套餐')) {
          errorMessage = '充值套餐不存在';
        }
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ paymentLoading: false });
    }
  },

  // 获取用户openid
  async getUserOpenId() {
    // 这里应该从后端获取用户的openid
    // 目前返回模拟数据，实际项目中需要实现获取openid的逻辑
    return this.data.userInfo?.openid || 'mock_openid_for_test';
  },

  // 调用微信支付
  async invokeWechatPay(paymentData) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: paymentData.timeStamp,
        nonceStr: paymentData.nonceStr,
        package: paymentData.package,
        signType: paymentData.signType,
        paySign: paymentData.paySign,
        success: (res) => {
          console.log('微信支付成功:', res);
          wx.showToast({
            title: '充值成功！',
            icon: 'success',
            duration: 2000
          });

          // 支付成功后刷新用户信息
          setTimeout(() => {
            this.refreshUserInfo();
          }, 1000);

          resolve(res);
        },
        fail: (err) => {
          console.error('微信支付失败:', err);

          if (err.errMsg.includes('cancel')) {
            wx.showToast({
              title: '支付已取消',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '支付失败，请重试',
              icon: 'none'
            });
          }

          reject(err);
        }
      });
    });
  },

  // 刷新用户信息
  async refreshUserInfo() {
    try {
      await authManager.refreshUserInfo();
      const userInfo = authManager.userInfo;
      this.setData({ userInfo });

      // 显示充值后的积分
      if (userInfo && userInfo.points) {
        wx.showModal({
          title: '充值成功',
          content: `您的当前积分：${userInfo.points}`,
          showCancel: false,
          confirmText: '确定'
        });
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  },

  // 查看充值记录
  viewRechargeHistory() {
    wx.navigateTo({
      url: '/pages/recharge-history/index'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '德州积分充值，多种套餐选择！',
      path: '/pages/recharge/index',
      imageUrl: '/assets/share-recharge.jpg'
    };
  }
});