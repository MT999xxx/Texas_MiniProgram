const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    userInfo: {
      nickname: '德州爱好者6228',
      avatarUrl: '',
      city: '重庆',
      id: '6228'
    },
    memberLevel: {
      level: 1,
      name: '普通会员',
      currentExp: 0,
      nextLevelExp: 500
    },
    nextLevelGap: 500,
    assets: {
      balance: 0,
      points: 0,
      coupons: 0
    },
    loading: true,
    isLoggedIn: false,
    isGuest: false
  },

  async onLoad() {
    await this.checkLoginStatus();
    if (!this.data.isLoggedIn) {
      // 未登录，显示登录提示
      this.showLoginTip();
      return;
    }
    await this.loadUserInfo();
    await this.loadMembershipInfo();
    await this.loadAssets();
  },

  async onShow() {
    await this.checkLoginStatus();
    if (this.data.isLoggedIn && !this.data.isGuest) {
      // 每次显示页面时刷新资产信息
      await this.loadAssets();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const isGuest = wx.getStorageSync('guestMode');
    this.setData({ isLoggedIn, isGuest });
  },

  // 显示登录提示
  showLoginTip() {
    this.setData({ loading: false });
    wx.showModal({
      title: '需要登录',
      content: '查看会员信息需要登录，是否前往登录？',
      confirmText: '去登录',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/member/index')
          });
        } else {
          wx.switchTab({
            url: '/pages/home/index'
          });
        }
      }
    });
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      // 获取微信用户信息（需要用户授权）
      const userInfo = await this.getUserProfile();
      if (userInfo) {
        this.setData({
          'userInfo.nickname': userInfo.nickName,
          'userInfo.avatarUrl': userInfo.avatarUrl
        });
      }
    } catch (error) {
      console.log('获取用户信息失败:', error);
      // 使用默认信息
    }
  },

  // 获取用户授权信息
  getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于展示会员信息',
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  },

  // 加载会员等级信息
  async loadMembershipInfo() {
    try {
      // 获取当前用户的会员信息
      const memberInfo = await request({
        url: '/membership/members/current', // 假设有这个接口
        method: 'GET'
      });

      if (memberInfo) {
        const nextLevelGap = memberInfo.nextLevelExp - memberInfo.currentExp;
        this.setData({
          memberLevel: {
            level: memberInfo.level?.level || 1,
            name: memberInfo.level?.name || '普通会员',
            currentExp: memberInfo.currentExp || 0,
            nextLevelExp: memberInfo.nextLevelExp || 500
          },
          nextLevelGap: Math.max(0, nextLevelGap)
        });
      }
    } catch (error) {
      console.error('加载会员信息失败:', error);
      // 使用默认值
    }
  },

  // 加载资产信息
  async loadAssets() {
    try {
      // 这里需要调用实际的用户资产接口
      // 暂时使用模拟数据
      const assets = {
        balance: 0,
        points: 0,
        coupons: 0
      };

      // 如果有实际接口，取消注释以下代码：
      /*
      const assets = await request({
        url: '/users/assets',
        method: 'GET'
      });
      */

      this.setData({
        assets,
        loading: false
      });
    } catch (error) {
      console.error('加载资产信息失败:', error);
      this.setData({ loading: false });
    }
  },

  // 查看会员权益
  viewBenefits() {
    wx.navigateTo({
      url: '/pages/member-benefits/index'
    });
  },

  // 通用导航方法
  navigateTo(e) {
    // 游客模式检查
    if (this.data.isGuest) {
      wx.showModal({
        title: '功能受限',
        content: '游客模式无法使用此功能，请登录后使用',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('guestMode');
            wx.navigateTo({
              url: '/pages/login/index'
            });
          }
        }
      });
      return;
    }

    const url = e.currentTarget.dataset.url;
    if (url) {
      // 检查页面是否存在
      const pages = [
        '/pages/recharge/index',
        '/pages/points/index',
        '/pages/coupons/index',
        '/pages/invite/index',
        '/pages/order-list/index',
        '/pages/reservation-list/index',
        '/pages/settings/index'
      ];

      if (pages.includes(url)) {
        wx.navigateTo({
          url: url,
          fail: () => {
            wx.showToast({
              title: '功能开发中',
              icon: 'none'
            });
          }
        });
      } else {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
      }
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await Promise.all([
      this.loadUserInfo(),
      this.loadMembershipInfo(),
      this.loadAssets()
    ]);
    wx.stopPullDownRefresh();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '德州扑克主题酒吧 - 邀请你来体验',
      path: '/pages/home/index',
      imageUrl: '/assets/share-image.jpg'
    };
  }
});