const authManager = require('../../utils/auth');
const { uploadFile } = require('../../utils/request');

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

    let avatarUrl = '';

    // 如果用户选择了头像且是临时文件，先上传到服务器获取永久URL
    // 微信临时文件路径以 wxfile:// 或 http://tmp 开头
    const tempPath = this.data.avatarUrl;
    const isTempFile = tempPath && (tempPath.startsWith('wxfile://') || tempPath.startsWith('http://tmp'));

    if (isTempFile) {
      try {
        console.log('正在上传头像...', tempPath);
        const uploadResult = await uploadFile(tempPath, '/uploads/avatar');
        avatarUrl = uploadResult.url;
        console.log('头像上传成功:', avatarUrl);
      } catch (err) {
        console.error('头像上传失败:', err);
        // 上传失败不阻止登录，使用默认头像
        avatarUrl = '/images/huiyuan2.jpg';
      }
    } else if (this.data.avatarUrl) {
      // 已经是有效URL或本地默认图片
      avatarUrl = this.data.avatarUrl;
    }

    // 使用用户输入的信息登录
    const userInfo = {
      nickName: this.data.nickname,
      avatarUrl: avatarUrl || ''
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
    wx.navigateTo({
      url: '/pages/agreement/index'
    });
  },

  // 查看隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/index'
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