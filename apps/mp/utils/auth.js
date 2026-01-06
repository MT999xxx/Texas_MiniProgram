// 全局登录管理
const authManager = {
  token: null,
  userInfo: null,

  // 设置用户信息
  setAuth(token, userInfo) {
    this.token = token;
    this.userInfo = userInfo;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
    // 单独保存 openid 供支付使用
    if (userInfo && userInfo.userId) {
      wx.setStorageSync('openid', userInfo.userId);
    }
  },

  // 获取存储的登录信息
  loadAuth() {
    try {
      this.token = wx.getStorageSync('token');
      this.userInfo = wx.getStorageSync('userInfo');
      return this.token && this.userInfo;
    } catch (error) {
      console.error('获取登录信息失败:', error);
      return false;
    }
  },

  // 清除登录信息
  clearAuth() {
    this.token = null;
    this.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
  },

  // 检查是否已登录
  isLoggedIn() {
    return !!(this.token && this.userInfo);
  },

  // 微信登录
  async wxLogin(userInfo = {}) {
    try {
      console.log('开始微信登录流程...', userInfo);

      // 1. 获取登录凭证
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        throw new Error('获取登录凭证失败');
      }

      console.log('获取到微信code:', loginRes.code);

      // 2. 发送到后端验证
      try {
        const request = require('./request');
        const response = await request({
          url: '/auth/wx-login',
          method: 'POST',
          data: {
            code: loginRes.code,
            nickname: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          }
        });

        console.log('后端登录成功:', response);

        // 3. 保存登录信息
        this.setAuth(response.token, response.user);

        return response.user;
      } catch (apiError) {
        console.warn('后端API调用失败，使用模拟登录:', apiError);
        console.log('API Error Details:', apiError.message || apiError);

        // Fallback: 使用模拟登录（开发环境）
        const mockUser = {
          id: 'mock_' + Date.now(),
          name: userInfo.nickName || '微信用户',
          nickname: userInfo.nickName || '微信用户',  // 预约代码使用 nickname
          nickName: userInfo.nickName || '微信用户',
          avatar: userInfo.avatarUrl || '/images/huiyuan2.jpg',
          phone: '',
          points: 0,
          level: { name: '普通会员', code: 'V1' }
        };

        const mockToken = 'mock_token_' + Date.now();

        // 保存模拟登录信息
        this.setAuth(mockToken, mockUser);

        console.log('模拟登录成功 (Persistence Enabled):', mockUser);

        return mockUser;
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  },

  // 静默登录检查
  async checkLogin() {
    // 先检查本地存储
    if (this.loadAuth()) {
      // 如果是模拟Token，直接认为有效（仅用于本地开发演示）
      if (this.token && this.token.startsWith('mock_token_')) {
        console.log('检测到模拟Token，跳过后端验证');
        return true;
      }

      try {
        // 验证token是否有效
        const request = require('./request');
        const user = await request({
          url: '/auth/profile',
          method: 'GET',
          silent: true // 验证过程不弹出错误提示
        });

        // 更新用户信息
        this.userInfo = user;
        wx.setStorageSync('userInfo', user);

        return true;
      } catch (error) {
        // token无效，清除登录信息
        console.log('Token验证失败或已过期');
        this.clearAuth();
        return false;
      }
    }
    return false;
  },

  // 强制登录
  async forceLogin() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '登录获取用户信息',
        success: async (res) => {
          try {
            const user = await this.wxLogin(res.userInfo);
            resolve(user);
          } catch (error) {
            reject(error);
          }
        },
        fail: (error) => {
          console.log('用户取消授权');
          reject(new Error('用户取消授权'));
        }
      });
    });
  },

  // 获取当前用户信息
  getUserInfo() {
    if (!this.userInfo) {
      this.loadAuth();
    }
    return this.userInfo;
  }
};

module.exports = authManager;