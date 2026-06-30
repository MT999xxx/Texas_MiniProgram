const authManager = require('./utils/auth');

App({
  globalData: {
    apiBase: 'https://dezhoubar.xyz/api',
    cdnBase: 'https://dezhoubar.xyz/api/static/images',
    userInfo: null,
  },

  async onLaunch() {
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

  getUserInfo() {
    return this.globalData.userInfo || authManager.userInfo;
  },

  async checkLoginStatus() {
    return await authManager.checkLogin();
  },

  requireLogin(redirectUrl) {
    const url = redirectUrl
      ? `/pages/login/index?redirect=${encodeURIComponent(redirectUrl)}`
      : '/pages/login/index';

    wx.navigateTo({
      url,
      fail: () => {
        wx.redirectTo({ url });
      },
    });
  },
});
