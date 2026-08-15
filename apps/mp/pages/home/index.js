// pages/home/index.js
const app = getApp();
const noticeApi = require('../../api/notice');
const coinsApi = require('../../api/coins');
const authManager = require('../../utils/auth');

console.log('home/index.js loaded');

Page({
  data: {
    tableEntryVisible: false,
    // 暂时使用本地图片，避免CDN 404问题
    bgUrl: '/images/setbar-panther-hero.jpg',
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
    locationText: '获取中',
    wifiText: '检测中',
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
    this.loadLocationStatus();
  },

  onShow: function () {
    this.loadNetworkStatus();
    // 页面显示时检查签到状态
    this.checkLoginAndLoadCheckIn();
  },

  /**
   * 获取首页定位状态。失败时静默降级，不影响首页其他功能。
   */
  loadLocationStatus: function () {
    if (typeof wx.getLocation !== 'function') {
      this.setData({ locationText: '当前设备不支持' });
      return;
    }

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: false,
      success: ({ latitude, longitude }) => {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          this.setData({ locationText: `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
          return;
        }
        this.setData({ locationText: '暂不可用' });
      },
      fail: () => {
        this.setData({ locationText: '未开启' });
      }
    });
  },

  /**
   * 显示当前网络状态；连接 Wi-Fi 时尽量读取网络名称。
   */
  loadNetworkStatus: function () {
    wx.getNetworkType({
      success: ({ networkType }) => {
        if (networkType !== 'wifi') {
          const labels = {
            none: '未连接',
            unknown: '状态未知'
          };
          this.setData({ wifiText: labels[networkType] || `${networkType.toUpperCase()} 网络` });
          return;
        }

        this.loadConnectedWifiName();
      },
      fail: () => {
        this.setData({ wifiText: '状态未知' });
      }
    });
  },

  loadConnectedWifiName: function () {
    if (typeof wx.startWifi !== 'function' || typeof wx.getConnectedWifi !== 'function') {
      this.setData({ wifiText: '已连接' });
      return;
    }

    wx.startWifi({
      complete: () => {
        wx.getConnectedWifi({
          success: ({ wifi }) => {
            this.setData({ wifiText: wifi?.SSID || '已连接' });
          },
          fail: () => {
            this.setData({ wifiText: '已连接' });
          }
        });
      }
    });
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

  goToRanking: function () {
    wx.redirectTo({
      url: '/pages/ranking/index',
      fail: (err) => {
        console.log("跳转失败", err);
      }
    });
  },

  goToMember: function () {
    wx.redirectTo({
      url: '/pages/member/index',
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
      title: 'Set baR · 酒廊与鸡尾酒吧',
      path: '/pages/home/index',
      imageUrl: '/images/setbar-panther-hero.jpg'
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline: function () {
    return {
      title: 'Set baR · 酒廊与鸡尾酒吧',
      imageUrl: '/images/setbar-panther-hero.jpg'
    };
  }
});
