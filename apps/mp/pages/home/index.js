// pages/home/index.js
const app = getApp();
const noticeApi = require('../../api/notice');
const coinsApi = require('../../api/coins');
const authManager = require('../../utils/auth');

console.log('home/index.js loaded');

Page({
  data: {   
    // 暂时使用本地图片，避免CDN 404问题
    bgUrl: '/images/hourse2.jpg',
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
    // 签到相关
    showCheckInPopup: false,
    checkInStatus: {
      checkedInToday: false,
      consecutiveDays: 0,
      todayPoints: 220,
      rewards: []
    },
    memberId: ''
  },

  onLoad: function (options) {
    console.log('home page onLoad');
  },

  onShow: function () {
    // 页面显示时检查签到状态
    this.checkLoginAndLoadCheckIn();
  },

  /**
   * 检查登录状态并加载签到信息
   */
  async checkLoginAndLoadCheckIn() {
    try {
      const isLoggedIn = await authManager.checkLogin();
      if (isLoggedIn) {
        const userInfo = authManager.getUserInfo();
        const memberId = userInfo?.id || userInfo?.memberId;
        if (memberId) {
          this.setData({ memberId });
          this.loadCheckInStatus(memberId);
        }
      }
    } catch (error) {
      console.log('未登录，跳过签到检查');
    }
  },

  /**
   * 加载签到状态
   */
  async loadCheckInStatus(memberId) {
    try {
      const status = await coinsApi.getCheckInStatus(memberId);
      this.setData({ checkInStatus: status });

      // 如果今日未签到，自动弹出签到弹窗
      if (!status.checkedInToday) {
        this.setData({ showCheckInPopup: true });
      }
    } catch (error) {
      console.error('获取签到状态失败:', error);
    }
  },

  /**
   * 显示签到弹窗
   */
  showCheckInPopup: function () {
    if (!this.data.memberId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ showCheckInPopup: true });
  },

  /**
   * 关闭签到弹窗
   */
  closeCheckInPopup: function () {
    this.setData({ showCheckInPopup: false });
  },

  /**
   * 执行签到
   */
  async doCheckIn() {
    if (!this.data.memberId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (this.data.checkInStatus.checkedInToday) {
      wx.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '签到中...' });
      const result = await coinsApi.performCheckIn(this.data.memberId);
      wx.hideLoading();

      wx.vibrateShort({ type: 'medium' });
      wx.showToast({
        title: `签到成功！+${result.pointsEarned}积分`,
        icon: 'success',
        duration: 2000
      });

      // 刷新签到状态
      this.loadCheckInStatus(this.data.memberId);

      // 延迟关闭弹窗
      setTimeout(() => {
        this.setData({ showCheckInPopup: false });
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '签到失败', icon: 'none' });
    }
  },

  // 显示最新公告
  showNotice: function () {
    console.log('showNotice clicked');
    var that = this;
    wx.showLoading({ title: '加载中' });
    noticeApi.getLatest('ANNOUNCEMENT')
      .then(notice => {
        wx.hideLoading();
        if (notice) {
          that.setData({
            modalVisible: true,
            modalTitle: notice.title || '公告详情',
            modalContent: notice.content
          });
        }
      })
      .catch(error => {
        wx.hideLoading();
        console.error('获取公告失败', error);
        wx.showToast({ title: '暂无公告', icon: 'none' });
      });
  },

  // 显示最新活动
  showActivity: function () {
    console.log('showActivity clicked');
    var that = this;
    wx.showLoading({ title: '加载中' });
    noticeApi.getLatest('ACTIVITY')
      .then(activity => {
        wx.hideLoading();
        if (activity) {
          that.setData({
            modalVisible: true,
            modalTitle: activity.title || '活动详情',
            modalContent: activity.content
          });
        }
      })
      .catch(error => {
        wx.hideLoading();
        console.error('获取活动失败', error);
        wx.showToast({ title: '暂无活动', icon: 'none' });
      });
  },

  // 关闭弹窗
  closeModal: function () {
    this.setData({
      modalVisible: false
    });
  },

  // 跳转到点餐页面
  goToMenu: function () {
    wx.navigateTo({
      url: '/pages/menu/index',
      fail: (err) => { console.error("跳转失败", err); }
    });
  },

  // 跳转到预约页面
  goToReservation: function () {
    wx.redirectTo({
      url: '/pages/table/index',
      fail: (err) => {
        console.log("跳转失败", err);
      }
    });
  },

  // 更新昵称
  updateNickname: function () {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 底部导航栏点击处理
  switchTab: function (e) {
    const index = e.currentTarget.dataset.index;
    const urls = [
      '/pages/home/index',
      '/pages/table/index',
      '/pages/ranking/index',
      '/pages/member/index'
    ];

    if (index !== 0) {
      wx.redirectTo({ url: urls[index] });
    }
  },

  /**
   * 用户点击右上角分享给朋友
   */
  onShareAppMessage: function () {
    return {
      title: '三条A·皇家扑克俱乐部',
      path: '/pages/home/index',
      imageUrl: '/images/share-cover.jpg'
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline: function () {
    return {
      title: '三条A·皇家扑克俱乐部 - 尊享德州扑克体验',
      imageUrl: '/images/share-cover.jpg'
    };
  }
});