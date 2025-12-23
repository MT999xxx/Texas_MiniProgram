// pages/home/index.js
const app = getApp();

Page({
  data: {
    // 暂时使用本地图片，避免CDN 404问题
    bgUrl: '/images/mouse.png',
  },

  onLoad: function (options) {
    // 页面加载逻辑
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
  }
});