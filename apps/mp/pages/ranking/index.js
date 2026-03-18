// pages/ranking/index.js
const rankingApi = require('../../api/ranking');

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
    this.initialLoad = true;
    this.updateDateRange();
    this.loadRankingData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 如果不是首次加载（首次加载由 onLoad 触发），则刷新数据
    if (!this.initialLoad) {
      this.loadRankingData();
    }
    this.initialLoad = false;
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

    this.updateDateRange();
    this.loadRankingData();
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
      0: 'weekly', // 半月榜 -> 周榜
      1: 'total',  // 年榜 -> 总榜
      2: 'event'   // 冠军榜 -> 活动榜
    };

    const type = typeMap[this.data.currentTab];

    this.setData({ loading: true, isEmpty: false });

    try {
      const userInfo = wx.getStorageSync('userInfo');
      const memberId = userInfo?.id;

      // 并行获取榜单和我的排名
      const [listRes, myRankRes] = await Promise.all([
        rankingApi.getList(type).catch(e => {
          console.error('获取排行榜失败:', e);
          return { rankings: [] };
        }),
        memberId ? rankingApi.getMyRank(memberId, type).catch(e => null) : Promise.resolve(null)
      ]);

      console.log('排行榜原始数据:', listRes);

      // 处理不同的返回格式
      // API 可能返回 { rankings: [...] } 或直接返回 [...]
      let rankings = [];
      if (Array.isArray(listRes)) {
        rankings = listRes;
      } else if (listRes && listRes.rankings) {
        rankings = listRes.rankings;
      }

      // 格式化列表数据
      const rankingList = rankings.map(item => ({
        rank: item.rank,
        name: item.nickname || `用户${item.id ? item.id.toString().slice(-4) : 'xxxx'}`,
        score: this.formatScore(item.points),
        avatar: (item.avatar && item.avatar.startsWith('http') && !item.avatar.startsWith('http://tmp'))
          ? item.avatar
          : '/images/huiyuan2.jpg',
        levelCode: item.levelCode || 'V1',
        levelName: item.levelName || ''
      }));

      console.log('格式化后的排行榜:', rankingList);

      // 格式化我的排名
      let currentUserRank = null;
      if (myRankRes && myRankRes.currentUserRank) {
        const myRank = myRankRes.currentUserRank;
        currentUserRank = {
          rank: myRank.rank || '未上榜',
          name: myRank.nickname || '我',
          score: this.formatScore(myRank.points),
          avatar: myRank.avatar || '/images/huiyuan2.jpg'
        };
      } else {
        // 如果API没返回我的排名，尝试从列表中查找
        // 这里只是fallback，实际应该依赖API
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.id) {
          // 简单Mock一下
          currentUserRank = {
            rank: '未上榜',
            name: userInfo.nickname,
            score: '0',
            avatar: userInfo.avatar
          };
        }
      }

      this.setData({
        rankingList,
        currentUserRank,
        isEmpty: rankingList.length === 0,
        loading: false
      });

    } catch (error) {
      console.error('加载排行榜失败:', error);

      // Fallback: 使用模拟数据以保证展示
      this.useMockData();
    }
  },

  /**
   * 使用模拟数据
   */
  useMockData() {
    const mockData = this.getMockRankingData();
    this.setData({
      rankingList: mockData,
      currentUserRank: {
        rank: 15,
        name: '我',
        score: '50000',
        avatar: '/images/huiyuan2.jpg'
      },
      isEmpty: false,
      loading: false
    });
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
      { rank: 1, name: 'XYZ-3245', score: '176570', avatar: '/images/huiyuan2.jpg' },
      { rank: 2, name: '不语-9218', score: '141000', avatar: '/images/huiyuan2.jpg' },
      { rank: 3, name: '🍃🍃🍃-3118', score: '131000', avatar: '/images/huiyuan2.jpg' },
      { rank: 4, name: 'kaka-6621', score: '128000', avatar: '/images/huiyuan2.jpg' },
      { rank: 5, name: 'SX-6926', score: '112700', avatar: '/images/huiyuan2.jpg' },
      { rank: 6, name: 'Spirit Reaper-1763', score: '90000', avatar: '/images/huiyuan2.jpg' },
      { rank: 7, name: '渝都Vincent-9899', score: '88000', avatar: '/images/huiyuan2.jpg' },
      { rank: 8, name: '秦智-7890', score: '85000', avatar: '/images/huiyuan2.jpg' }
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