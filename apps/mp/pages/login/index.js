const authManager = require('../../utils/auth');

Page({
  data: {
    loading: false,
    showGuestTip: true,
    avatarUrl: '',
    nickname: '',
    isAgreed: false
  },

  async onLoad(options) {
    console.log('登录页面加载');
    // 检查是否已登录
    const isLoggedIn = await authManager.checkLogin();
    if (isLoggedIn) {
      // 已登录，跳转回原页面或首页
      this.navigateBack(options.redirect);
      return;
    }
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择头像成功:', avatarUrl);
    this.setData({ avatarUrl });
  },

  // 输入昵称
  onInputNickname(e) {
    const nickname = e.detail.value;
    this.setData({ nickname });
  },

  // 协议状态切换
  onAgreementChange(e) {
    const isAgreed = e.detail.value.length > 0;
    this.setData({ isAgreed });
  },

  // 点击登录按钮
  async onLoginClick() {
    console.log('点击了登录确认按钮');

    if (!this.data.nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    if (!this.data.isAgreed) {
      wx.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' });
      return;
    }

    // 显示加载状态
    this.setData({ loading: true });

    // 使用用户输入的信息登录
    const userInfo = {
      nickName: this.data.nickname,
      avatarUrl: this.data.avatarUrl || '/images/huiyuan2.jpg'
    };

    this.handleLogin(userInfo);
  },



  // 处理登录
  async handleLogin(userInfo) {
    try {
      console.log('开始处理登录...');
      const user = await authManager.wxLogin(userInfo);

      console.log('登录成功:', user);

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

  // 获取用户信息并登录 (保留兼容)
  async onGetUserProfile(e) {
    console.log('onGetUserProfile triggered', e);
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
      title: '用户服务协议',
      content: '欢迎使用三条A小程序。本协议是您与三条A之间关于您使用本小程序服务所订立的协议。您在使用本小程序提供的点餐、预约及会员服务时，请务必审慎阅读、充分理解各条款内容。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 查看隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们非常重视您的个人信息保护。为了向您提供点餐、桌面预约和会员权益服务，我们会收集您的头像、昵称、手机号及订单信息。我们承诺将严格按照法律法规及隐私保护指引的要求保护您的个人信息。',
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