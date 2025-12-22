const authManager = require('./utils/auth');

App({
  globalData: {
    apiBase: 'https://dolichocranic-unomnipotently-therese.ngrok-free.dev',
    // CDN地址 - 通过 ngrok 隧道访问
    cdnBase: 'https://dolichocranic-unomnipotently-therese.ngrok-free.dev/static/images',
    userInfo: null,
  },

  async onLaunch() {
    // 尝试静默登录
    try {
      const isLoggedIn = await authManager.checkLogin();
      if (isLoggedIn) {
        this.globalData.userInfo = authManager.userInfo;
        console.log('自动登录成功');
      }
    } catch (error) {
      console.log('自动登录失败:', error);
    }
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo || authManager.userInfo;
  },

  // 检查登录状态
  async checkLoginStatus() {
    return await authManager.checkLogin();
  },

  // 强制登录
  requireLogin(redirectUrl) {
    const url = redirectUrl
      ? `/pages/login/index?redirect=${encodeURIComponent(redirectUrl)}`
      : '/pages/login/index';

    wx.navigateTo({
      url,
      fail: () => {
        wx.redirectTo({ url });
      }
    });
  }
});
