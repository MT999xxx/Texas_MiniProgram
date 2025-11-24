// pages/ranking/index.js
const request = require('../../utils/request.js');

Page({
  data: {
    currentTab: 0, // 0: 半月榜, 1: 年榜, 2: 冠军榜
    rankingList: [],
    currentUserRank: null, // 当前用户排名信息
    loading: false,
    isEmpty: false,
    dateRange: '' // 日期范围显示
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadRankingData();
    this.updateDateRange();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示时刷新数据
    this.loadRankingData();
  },

  /**
   * 切换 Tab
   */
  switchRankingTab: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (index === this.data.currentTab) return; // 避免重复加载

    this.setData({
      currentTab: index
    });

    this.loadRankingData();
    this.updateDateRange();
  },

  /**
   * 更新日期范围显示
   */
  updateDateRange() {
    const now = new Date();
    let dateRange = '';

    if (this.data.currentTab === 0) {
      // 半月榜 - 显示本周日期范围
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      dateRange = `${this.formatDate(weekStart)}至${this.formatDate(weekEnd)}`;
    } else if (this.data.currentTab === 1) {
      // 年榜 - 显示今年
      dateRange = `${now.getFullYear()}年度`;
    } else {
      // 冠军榜
      dateRange = '活动专榜';
    }

    this.setData({ dateRange });
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  },

  /**
   * 加载排行榜数据
   */
  async loadRankingData() {
    // 映射tab到后端type
    const typeMap = {
      0: 'weekly',  // 半月榜 -> 周榜
      1: 'total',   // 年榜 -> 总榜
      2: 'event'    // 冠军榜 -> 活动榜
    };

    const type = typeMap[this.data.currentTab];

    this.setData({ loading: true, isEmpty: false });

    try {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
      const userId = userInfo?.id;

      let response;

      if (userId) {
        // 如果已登录，获取排行榜和用户排名
        response = await request.get(`/loyalty/leaderboard-with-user/${userId}`, {
          type,
          limit: 50
        });
      } else {
        // 未登录只获取排行榜
        response = await request.get('/loyalty/leaderboard', {
          type,
          limit: 50
        });
      }

      console.log('排行榜数据:', response);

      // 格式化数据
      const rankingList = (response.rankings || []).map(item => ({
        rank: item.rank,
        name: item.nickname || `用户${item.id.slice(0, 8)}`,
        score: this.formatScore(item.points),
        avatar: item.avatar || '/images/会员图标.png',
        levelName: item.levelName || 'V1 普通会员'
      }));

      this.setData({
        rankingList,
        currentUserRank: response.currentUserRank ? {
          rank: response.currentUserRank.rank || '未上榜',
          name: response.currentUserRank.nickname || '我',
          score: this.formatScore(response.currentUserRank.points),
          avatar: response.currentUserRank.avatar || '/images/会员图标.png'
        } : null,
        isEmpty: rankingList.length === 0,
        loading: false
      });

    } catch (error) {
      console.error('加载排行榜失败:', error);

      // 使用模拟数据（开发环境）
      console.log('使用模拟排行榜数据');
      const mockData = this.getMockRankingData();

      this.setData({
        rankingList: mockData,
        currentUserRank: {
          rank: 15,
          name: '我',
          score: '50000',
          avatar: '/images/会员图标.png'
        },
        isEmpty: false,
        loading: false
      });
    }
  },

  /**
   * 格式化分数显示
   */
  formatScore(points) {
    if (!points && points !== 0) return '0';
    return points.toString();
  },

  /**
   * 获取模拟数据
   */
  getMockRankingData() {
    return [
      { rank: 1, name: 'XYZ-3245', score: '176570', avatar: '/images/会员图标.png' },
      { rank: 2, name: '不语-9218', score: '141000', avatar: '/images/会员图标.png' },
      { rank: 3, name: '🍃🍃🍃-3118', score: '131000', avatar: '/images/会员图标.png' },
      { rank: 4, name: 'kaka-6621', score: '128000', avatar: '/images/会员图标.png' },
      { rank: 5, name: 'SX-6926', score: '112700', avatar: '/images/会员图标.png' },
      { rank: 6, name: 'Spirit Reaper-1763', score: '90000', avatar: '/images/会员图标.png' },
      { rank: 7, name: '渝都Vincent-9899', score: '88000', avatar: '/images/会员图标.png' },
      { rank: 8, name: '秦智-7890', score: '85000', avatar: '/images/会员图标.png' }
    ];
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadRankingData().then(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '德州扑克排行榜 - 看看谁是德州之王！',
      path: '/pages/ranking/index'
    };
  }
});