Page({
  goReservation() {
    wx.navigateTo({
      url: '/pages/reservation/index',
    });
  },
  goMenu() {
    wx.showToast({ title: '菜单功能开发中', icon: 'none' });
  },
});
