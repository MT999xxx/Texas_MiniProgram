// pages/member/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      avatar: '/images/会员图标.png', // 暂时使用通用图标
      nickname: '德州爱好者6228',
      id: '重庆-6228'
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
    ]
  },

  /**
   * 充值按钮点击
   */
  onRecharge() {
    wx.showToast({
      title: '充值功能开发中',
      icon: 'none'
    });
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
  onShow() {

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