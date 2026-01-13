// pages/member/index.js
const authManager = require('../../utils/auth');
const coinsApi = require('../../api/coins');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false, // 添加登录状态
    memberId: '', // 添加会员ID
    userInfo: {
      avatar: '/images/huiyuan2.jpg', // 暂时使用通用图标
      nickname: '点击登录',
      id: ''
    },
    memberInfo: {
      level: 'V1',
      levelName: '普通会员',
      nextLevelDiff: 500
    },
    stats: {
      coins: 0,
      points: 0,
      coupons: 0
    },
    menuList: [
      { icon: '/images/shouye2.jpg', text: '我的订单', url: '/pages/order-list/index' },
      { icon: '/images/zhuomian2.jpg', text: '我的预约', url: '/pages/reservation/index' },
      { icon: '/images/paihangbang2.jpg', text: '我的优惠券', url: '' },
    ],

    // 充值弹窗
    showRechargePopup: false,
    rechargeOptions: [
      { amount: 500, bonus: 7500, desc: '赠送7500积分' },
      { amount: 1000, bonus: 20000, desc: '赠送20000积分' },
      { amount: 3000, bonus: 72000, desc: '赠送72000积分+5张酒券' },
      { amount: 5000, bonus: 120000, desc: '赠送120000积分+10张酒券' }
    ],
    selectedAmount: 500,
    inputAmount: '',

    // 存积分弹窗
    showDepositPopup: false,
    depositAmount: '',

    // 取积分弹窗
    showWithdrawPopup: false,
    withdrawAmount: '',

    // 积分兑换金币弹窗
    showExchangePopup: false,
    exchangeCoins: ''
  },

  /**
   * 点击头像/用户信息
   */
  onUserInfoClick() {
    if (!this.data.isLogin) {
      // 未登录，跳转登录页
      wx.navigateTo({
        url: '/pages/login/index'
      });
    }
  },

  /**
   * 菜单项点击
   */
  onMenuClick(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.menuList[index];

    if (item && item.url) {
      wx.navigateTo({
        url: item.url,
        fail: () => {
          // 如果navigateTo失败（可能是tabbar页面），尝试switchTab
          wx.switchTab({ url: item.url });
        }
      });
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  },

  /**
   * 充值按钮点击
   */
  onRecharge() {
    this.setData({
      showRechargePopup: true
    });
  },

  /**
   * 隐藏充值弹窗
   */
  hideRecharge() {
    this.setData({
      showRechargePopup: false
    });
  },

  /**
   * 选择充值金额
   */
  selectAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({
      selectedAmount: amount,
      inputAmount: '' // 选择预设时清空输入框
    });
  },

  /**
   * 输入自定义金额
   */
  onInputAmount(e) {
    const value = e.detail.value;
    this.setData({
      inputAmount: value,
      selectedAmount: 0 // 输入时取消预设选中
    });
  },

  /**
   * 清除输入
   */
  clearInput() {
    this.setData({
      inputAmount: '',
      selectedAmount: 500 // 清除后默认选中第一个
    });
  },

  /**
   * 提交充值
   */
  submitRecharge() {
    const amount = this.data.inputAmount || this.data.selectedAmount;
    if (!amount) {
      wx.showToast({
        title: '请选择或输入金额',
        icon: 'none'
      });
      return;
    }

    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 获取 openid（与其他支付流程保持一致）
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({ title: '请重新登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发起支付...' });
    coinsApi.createRecharge(Number(amount), openid)
      .then(res => {
        wx.hideLoading();
        const paymentId = res.paymentId; // 保存支付ID用于后续查询
        // 调用微信支付
        wx.requestPayment({
          timeStamp: res.timeStamp,
          nonceStr: res.nonceStr,
          package: res.package,
          signType: res.signType || 'RSA',
          paySign: res.paySign,
          success: () => {
            // 支付成功后，主动查询支付状态来触发后端处理（防止回调延迟）
            wx.showLoading({ title: '处理中...' });
            coinsApi.getPaymentStatus(paymentId)
              .then(() => {
                wx.hideLoading();
                wx.showToast({ title: '充值成功', icon: 'success' });
                this.hideRecharge();
                this.loadBalance();
              })
              .catch(() => {
                wx.hideLoading();
                // 即使查询失败也显示成功（微信支付已成功）
                wx.showToast({ title: '充值成功', icon: 'success' });
                this.hideRecharge();
                this.loadBalance();
              });
          },
          fail: (err) => {
            if (err.errMsg.includes('cancel')) {
              wx.showToast({ title: '已取消支付', icon: 'none' });
            } else {
              wx.showToast({ title: '支付失败', icon: 'none' });
            }
          }
        });
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '充值失败', icon: 'none' });
      });
  },

  // ========== 存积分 ==========
  showDepositDialog() {
    this.setData({ showDepositPopup: true, depositAmount: '' });
  },
  hideDepositDialog() {
    this.setData({ showDepositPopup: false });
  },
  onDepositInput(e) {
    this.setData({ depositAmount: e.detail.value });
  },
  clearDepositInput() {
    this.setData({ depositAmount: '' });
  },
  submitDeposit() {
    const points = parseInt(this.data.depositAmount);
    if (!points || points <= 0) {
      wx.showToast({ title: '请输入有效的积分数量', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    coinsApi.depositPoints(this.data.memberId, points)
      .then(res => {
        wx.hideLoading();
        wx.showToast({ title: '申请已提交，等待审核', icon: 'success' });
        this.hideDepositDialog();
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      });
  },

  // ========== 取积分 ==========
  showWithdrawDialog() {
    this.setData({ showWithdrawPopup: true, withdrawAmount: '' });
  },
  hideWithdrawDialog() {
    this.setData({ showWithdrawPopup: false });
  },
  onWithdrawInput(e) {
    this.setData({ withdrawAmount: e.detail.value });
  },
  clearWithdrawInput() {
    this.setData({ withdrawAmount: '' });
  },
  submitWithdraw() {
    const points = parseInt(this.data.withdrawAmount);
    if (!points || points <= 0) {
      wx.showToast({ title: '请输入有效的积分数量', icon: 'none' });
      return;
    }
    if (points > this.data.stats.points) {
      wx.showToast({ title: '积分余额不足', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '取积分中...' });
    coinsApi.withdrawPoints(this.data.memberId, points)
      .then(res => {
        wx.hideLoading();
        wx.showToast({ title: '取积分成功', icon: 'success' });
        this.hideWithdrawDialog();
        this.loadBalance();
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      });
  },

  // ========== 积分兑换金币 ==========
  showExchangeDialog() {
    this.setData({ showExchangePopup: true, exchangeCoins: '' });
  },
  hideExchangeDialog() {
    this.setData({ showExchangePopup: false });
  },
  onExchangeInput(e) {
    this.setData({ exchangeCoins: e.detail.value });
  },
  clearExchangeInput() {
    this.setData({ exchangeCoins: '' });
  },
  submitExchange() {
    const coins = parseInt(this.data.exchangeCoins);
    if (!coins || coins <= 0) {
      wx.showToast({ title: '请输入有效的金币数量', icon: 'none' });
      return;
    }
    const pointsNeeded = coins * 20;
    if (pointsNeeded > this.data.stats.points) {
      wx.showToast({ title: `积分不足，需要 ${pointsNeeded} 积分`, icon: 'none' });
      return;
    }
    wx.showLoading({ title: '兑换中...' });
    coinsApi.exchangeCoins(this.data.memberId, coins)
      .then(res => {
        wx.hideLoading();
        wx.showToast({ title: `成功兑换 ${coins} 金币`, icon: 'success' });
        this.hideExchangeDialog();
        this.loadBalance();
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '兑换失败', icon: 'none' });
      });
  },

  /**
   * 加载余额信息
   */
  loadBalance() {
    if (!this.data.memberId) return;
    coinsApi.getBalance(this.data.memberId)
      .then(res => {
        this.setData({
          'stats.coins': res.coins || 0,
          'stats.points': res.points || 0
        });
      })
      .catch(() => { });
  },

  /**
   * 菜单点击
   */
  onMenuClick(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.menuList[index];
    if (item.url) {
      wx.navigateTo({
        url: item.url
      });
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          authManager.clearAuth();
          // Reset page data
          this.setData({
            isLogin: false,
            userInfo: {
              avatar: '/images/huiyuan2.jpg',
              nickname: '点击登录',
              id: ''
            },
            stats: {
              coins: 0,
              points: 0,
              coupons: 0
            }
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          // 如果app.js有全局用户信息也需要清理
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = null;
          }
        }
      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    // 检查登录状态
    try {
      const isLoggedIn = await authManager.checkLogin();
      if (isLoggedIn) {
        const userInfo = authManager.getUserInfo();
        // Update globalData in app.js if needed, though this is a page context
        // getApp().globalData.userInfo = userInfo; // Example if app.js needs it
        console.log('自动登录成功:', userInfo);
        this.setData({
          isLogin: true,
          memberId: userInfo.memberId || userInfo.id || '',
          userInfo: {
            avatar: userInfo.avatar || '/images/huiyuan2.jpg',
            nickname: userInfo.nickname || userInfo.nickName || '德州爱好者', // Handle both nickName and nickname
            id: userInfo.id || ''
          }
        });
        // 加载余额信息
        this.loadBalance();
      } else {
        this.setData({
          isLogin: false,
          memberId: '',
          userInfo: {
            avatar: '/images/huiyuan2.jpg',
            nickname: '点击登录',
            id: ''
          }
        });
      }
    } catch (error) {
      console.warn('自动登录过程异常:', error);
      this.setData({
        isLogin: false,
        userInfo: {
          avatar: '/images/huiyuan2.jpg',
          nickname: '点击登录',
          id: ''
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  stopBubble() { }
})