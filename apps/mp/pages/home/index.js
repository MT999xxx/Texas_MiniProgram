Page({
  data: {
    quickActions: [
      { title: '桌位预约', subtitle: 'Reservation', icon: '🎯', url: '/pages/reservation/index' },
      { title: '点餐', subtitle: 'Order Now', icon: '🍺', url: '/pages/menu/index' },
    ],
    tools: [
      { label: '点单', desc: 'Order', icon: '🍸', url: '/pages/menu/index' },
      { label: '预约', desc: 'Booking', icon: '📅', url: '/pages/reservation/index' },
      { label: '排行榜', desc: 'Ranking', icon: '📊', url: '/pages/ranking/index' },
      { label: '会员', desc: 'Members', icon: '👤', url: '/pages/member/index' },
    ],
    activities: [
      { tag: '活动', title: '周末德州扑克大赛火热报名中', time: '2 小时前' },
      { tag: '福利', title: '新会员注册即送 200 积分', time: '1 天前' },
      { tag: '通知', title: '本周五店内装修，暂停营业一天', time: '3 天前' },
    ],
  },

  handleQuickAction(e) {
    const url = e.currentTarget.dataset.url;
    this.navigate(url);
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    this.navigate(url);
  },

  navigate(url) {
    if (!url) return;
    wx.navigateTo({
      url,
      fail: () => {
        wx.showToast({
          title: '页面开发中',
          icon: 'none',
        });
      },
    });
  },

  viewAllActivities() {
    wx.showToast({
      title: '更多活动尽请期待',
      icon: 'none',
    });
  },
});
