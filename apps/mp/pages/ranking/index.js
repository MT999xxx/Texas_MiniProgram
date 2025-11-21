// pages/ranking/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 0, // 0: 半月榜, 1: 年榜, 2: 冠军榜
    rankingList: [
      { rank: 1, name: 'XYZ-3245', score: '176570', avatar: '/images/会员图标.png' },
      { rank: 2, name: '不语-9218', score: '141000', avatar: '/images/会员图标.png' },
      { rank: 3, name: '🍃🍃🍃-3118', score: '131000', avatar: '/images/会员图标.png' },
      { rank: 4, name: 'kaka-6621', score: '128000', avatar: '/images/会员图标.png' },
      { rank: 5, name: 'SX-6926', score: '112700', avatar: '/images/会员图标.png' },
      { rank: 6, name: 'Spirit Reaper-1763', score: '90000', avatar: '/images/会员图标.png' },
      { rank: 7, name: '渝都Vincent-9899', score: '88000', avatar: '/images/会员图标.png' },
      { rank: 8, name: '秦智-7890', score: '85000', avatar: '/images/会员图标.png' }
    ]
  },

  /**
   * 切换 Tab
   */
  switchRankingTab: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      currentTab: index
    });
    // 这里可以添加根据 Tab 切换加载不同数据的逻辑
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})