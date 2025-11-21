// pages/home/index.js
Page({
  data: {
    // 如果需要动态数据可以在这里添加
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

  // 底部导航栏点击处理 (因为是自定义 view，需要手动处理跳转)
  switchTab: function (e) {
    const index = e.currentTarget.dataset.index;
    const urls = [
      '/pages/home/index',      // 0: 首页
      '/pages/table/index',     // 1: 桌面
      '/pages/ranking/index',   // 2: 排行榜
      '/pages/member/index'     // 3: 会员
    ];

    // 如果点击的不是当前页，则跳转
    if (index !== 0) {
      // 使用 redirectTo 避免页面栈堆积，模拟 Tab 切换体验
      wx.redirectTo({ url: urls[index] });
    }
  }
});