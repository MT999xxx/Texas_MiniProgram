// pages/home/index.js
const app = getApp();
const noticeApi = require('../../api/notice');

console.log('home/index.js loaded');

Page({
  data: {
    // 暂时使用本地图片，避免CDN 404问题
    bgUrl: '/images/hourse.jpg',
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
  },

  onLoad: function (options) {
    console.log('home page onLoad');
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
  }
});