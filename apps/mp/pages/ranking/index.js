const { request } = require('../../utils/request');

Page({
  data: {
    tabs: [
      { label: '总榜', value: 'total' },
      { label: '周榜', value: 'weekly' },
      { label: '活动榜', value: 'event' }
    ],
    currentTab: 'total',
    rankings: [],
    currentUserRank: null,
    loading: false,
    refreshing: false
  },

  async onLoad() {
    await this.loadRankings();
  },

  // 加载排行榜数据
  async loadRankings() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { currentTab } = this.data;

      // 调用后端接口
      /* 实际接口示例：
      const result = await request({
        url: '/loyalty/leaderboard',
        method: 'GET',
        data: { type: currentTab }
      });
      const { rankings, currentUserRank } = result;
      */

      // 使用模拟数据
      const mockData = this.getMockRankings(currentTab);

      this.setData({
        rankings: mockData.rankings,
        currentUserRank: mockData.currentUserRank,
        loading: false,
        refreshing: false
      });
    } catch (error) {
      console.error('加载排行榜失败:', error);
      this.setData({
        loading: false,
        refreshing: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 获取模拟数据
  getMockRankings(type) {
    const basePoints = type === 'total' ? 10000 : type === 'weekly' ? 500 : 800;
    const nicknames = [
      '德州之王', '全压大师', 'Allin玩家', '读牌高手', '筹码收割机',
      '冷静狙击手', '翻牌艺术家', '底池猎人', '位置大师', '概率达人',
      '德州新星', '稳健玩家', '激进派', '保守派', '运气之子',
      '战术大师', '数学天才', '心理专家', '牌桌杀手', '常胜将军'
    ];

    const levels = ['V1 普通会员', 'V2 银卡会员', 'V3 金卡会员', 'V4 白金会员', 'V5 钻石会员'];

    const rankings = nicknames.map((nickname, index) => {
      const points = Math.max(basePoints - index * (basePoints / 30), 0);
      return {
        id: `user-${index}`,
        nickname,
        avatar: '',
        points: Math.floor(points),
        levelName: levels[Math.min(Math.floor(index / 4), 4)],
        isCurrentUser: index === 10 // 假设当前用户排名第11
      };
    });

    // 当前用户排名
    const currentUserRank = {
      rank: 11,
      nickname: '德州新星',
      avatar: '',
      points: rankings[10]?.points || 0,
      levelName: 'V2 银卡会员'
    };

    return { rankings, currentUserRank };
  },

  // 切换标签
  async switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;

    this.setData({
      currentTab: tab,
      rankings: [],
      currentUserRank: null
    });

    await this.loadRankings();
  },

  // 下拉刷新
  async onRefresh() {
    this.setData({ refreshing: true });
    await this.loadRankings();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.onRefresh();
    wx.stopPullDownRefresh();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '快来看看排行榜，挑战德州扑克之王！',
      path: '/pages/ranking/index',
      imageUrl: '/assets/share-ranking.jpg'
    };
  }
});