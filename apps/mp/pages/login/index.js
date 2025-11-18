const authManager = require('../../utils/auth');

Page({
  data: {
    loading: false,
    showGuestTip: true
  },

  async onLoad(options) {
    // 检查是否已登录
    const isLoggedIn = await authManager.checkLogin();
    if (isLoggedIn) {
      // 已登录，跳转回原页面或首页
      this.navigateBack(options.redirect);
      return;
    }
  },

  // 获取用户信息并登录
  async onGetUserProfile(e) {
    this.setData({ loading: true });

    try {
      // 调用微信登录
      const user = await authManager.wxLogin(e.detail.userInfo);

      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      });

      // 延迟跳转
      setTimeout(() => {
        this.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ loading: false });
    }
  },

  // 游客模式
  continueAsGuest() {
    wx.showModal({
      title: '游客模式',
      content: '游客模式仅可浏览部分内容，无法使用点餐、预约、积分等功能。确定继续吗？',
      confirmText: '继续',
      cancelText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 设置游客标记
          wx.setStorageSync('guestMode', true);
          this.navigateBack();
        }
      }
    });
  },

  // 查看用户协议
  showUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 查看隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 返回上一页或首页
  navigateBack(redirect) {
    const pages = getCurrentPages();
    if (redirect) {
      // 跳转到指定页面
      wx.redirectTo({
        url: decodeURIComponent(redirect),
        fail: () => {
          wx.switchTab({
            url: '/pages/home/index'
          });
        }
      });
    } else if (pages.length > 1) {
      // 返回上一页
      wx.navigateBack();
    } else {
      // 跳转首页
      wx.switchTab({
        url: '/pages/home/index'
      });
    }
  }
});