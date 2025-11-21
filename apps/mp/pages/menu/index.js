// pages/menu/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    categories: [
      { id: 1, name: '经典' },
      { id: 2, name: '德州主题' },
      { id: 3, name: '无酒精' },
      { id: 4, name: '啤酒' },
      { id: 5, name: '小吃' },
      { id: 6, name: '酒券套餐' },
      { id: 7, name: '积分商城' }
    ],
    currentCategory: 0, // 当前选中的分类索引
    goodsList: [
      { id: 1, name: '古典', desc: '威士忌|苦精|糖|橙子', price: 68, image: '/images/桌面图标.png' }, // 暂用占位图
      { id: 2, name: '金汤力', desc: '杜松子|青柠|奎宁', price: 68, image: '/images/桌面图标.png' },
      { id: 3, name: '自由古巴', desc: '朗姆|青柠|可乐', price: 68, image: '/images/桌面图标.png' },
      { id: 4, name: '曼哈顿', desc: '黑麦威士忌|苦精|葡萄酒|樱桃', price: 68, image: '/images/桌面图标.png' },
      { id: 5, name: '长岛冰茶', desc: '<伏特加|君度|黑朗姆|金酒|龙舌兰|可乐|柠檬汁> 20%vol', price: 68, image: '/images/桌面图标.png' },
      { id: 6, name: '威士忌酸', desc: '19世纪美国淘金热中，矿工用威士忌、柠檬和糖调出威士忌酸', price: 68, image: '/images/桌面图标.png' }
    ]
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentCategory: index
    });
    // 这里可以添加根据分类加载不同商品数据的逻辑
  },

  /**
   * 加购
   */
  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    });
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