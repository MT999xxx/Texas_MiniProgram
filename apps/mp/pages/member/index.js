// pages/member/index.js
const authManager = require('../../utils/auth');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false, // 添加登录状态
    userInfo: {
      avatar: '/images/会员图标.png', // 暂时使用通用图标
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
      { icon: '/images/首页图标.png', text: '邀请有礼', url: '' }, // 暂时使用通用图标
      { icon: '/images/桌面图标.png', text: '存积分', url: '' },
      { icon: '/images/排行榜图标.png', text: '订单列表', url: '' },
    ],
    showRechargePopup: false,
    rechargeOptions: [
      { amount: 500, bonus: 7500, desc: '赠送7500积分' },
      { amount: 1000, bonus: 20000, desc: '赠送20000积分' },
      { amount: 3000, bonus: 72000, desc: '赠送72000积分+5张酒券' },
      { amount: 5000, bonus: 120000, desc: '赠送120000积分+10张酒券' }
    ],
    selectedAmount: 500,
    inputAmount: ''
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
    wx.showLoading({ title: '充值中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '充值成功',
        icon: 'success'
      });
      this.hideRecharge();
    }, 1500);
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
    const isLoggedIn = await authManager.checkLogin();
    if (isLoggedIn) {
      const userInfo = authManager.getUserInfo();
      this.setData({
        isLogin: true,
        userInfo: {
          avatar: userInfo.avatar || '/images/会员图标.png',
          nickname: userInfo.nickname || '德州爱好者',
          id: userInfo.id || ''
        }
      });
    } else {
      this.setData({
        isLogin: false,
        userInfo: {
          avatar: '/images/会员图标.png',
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

  }
})