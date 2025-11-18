Page({
  data: {
    announcements: [
      { id: 1, tag: '活动', title: '周末德州扑克大赛火热报名中', time: '2小时前' },
      { id: 2, tag: '福利', title: '新会员注册送200积分', time: '1天前' },
      { id: 3, tag: '通知', title: '本周五店内装修，暂停营业一天', time: '3天前' }
    ]
  },

  onLoad() {
    // 页面加载时可以加载公告等数据
    this.loadAnnouncements();
  },

  // 加载公告
  async loadAnnouncements() {
    // 这里可以调用实际的API
    // const announcements = await request({ url: '/announcements', method: 'GET' });
    // this.setData({ announcements });
  },

  // 跳转预约页面
  goReservation() {
    wx.navigateTo({
      url: '/pages/reservation/index'
    });
  },

  // 跳转点餐页面
  goMenu() {
    wx.navigateTo({
      url: '/pages/menu/index'
    });
  },

  // 通用导航
  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({
        url: url,
        fail: () => {
          wx.showToast({
            title: '页面开发中',
            icon: 'none'
          });
        }
      });
    }
  },

  // 查看公告详情
  viewAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '公告详情功能开发中',
      icon: 'none'
    });
  },

  // 查看所有公告
  viewAllAnnouncements() {
    wx.showToast({
      title: '公告列表功能开发中',
      icon: 'none'
    });
  },

  // 切换底部Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    const urlMap = {
      home: '/pages/home/index',
      table: '/pages/reservation/index',
      ranking: '/pages/ranking/index',
      member: '/pages/member/index'
    };

    const url = urlMap[tab];
    if (!url || tab === 'home') return;

    wx.navigateTo({
      url: url,
      fail: () => {
        wx.showToast({
          title: '页面开发中',
          icon: 'none'
        });
      }
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '德州扑克主题酒吧 - 重庆店尖子tusk',
      path: '/pages/home/index',
      imageUrl: '/assets/share-image.jpg'
    };
  }
});
