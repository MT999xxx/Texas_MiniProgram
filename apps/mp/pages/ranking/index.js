const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

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
    refreshing: false,
    userInfo: null,
    isLoggedIn: false
  },

  async onLoad() {
    await this.checkLoginStatus();
    await this.loadRankings();
  },

  async onShow() {
    await this.checkLoginStatus();
    await this.loadRankings();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const userInfo = authManager.userInfo;
    this.setData({ isLoggedIn, userInfo });
  },

  // 加载排行榜数据
  async loadRankings() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { currentTab, userInfo, isLoggedIn } = this.data;

      if (isLoggedIn && userInfo?.id) {
        // 已登录用户：同时获取排行榜和用户排名
        const result = await request({
          url: `/loyalty/leaderboard-with-user/${userInfo.id}`,
          method: 'GET',
          data: { type: currentTab, limit: 50 }
        });

        this.setData({
          rankings: result.rankings || [],
          currentUserRank: result.currentUserRank,
          loading: false,
          refreshing: false
        });
      } else {
        // 未登录用户：只获取排行榜
        const result = await request({
          url: '/loyalty/leaderboard',
          method: 'GET',
          data: { type: currentTab, limit: 50 }
        });

        this.setData({
          rankings: result.rankings || [],
          currentUserRank: null,
          loading: false,
          refreshing: false
        });
      }
    } catch (error) {
      console.error('加载排行榜失败:', error);

      // 如果API失败，回退到模拟数据
      console.log('回退到模拟数据');
      const mockData = this.getMockRankings(this.data.currentTab);

      this.setData({
        rankings: mockData.rankings,
        currentUserRank: mockData.currentUserRank,
        loading: false,
        refreshing: false
      });

      wx.showToast({
        title: '使用模拟数据',
        icon: 'none',
        duration: 1000
      });
    }
  },

  // 获取模拟数据（作为备份）
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
        rank: index + 1,
        id: `user-${index}`,
        nickname,
        avatar: '',
        points: Math.floor(points),
        levelName: levels[Math.min(Math.floor(index / 4), 4)],
        isCurrentUser: index === 10 // 假设当前用户排名第11
      };
    });

    // 当前用户排名
    const currentUserRank = this.data.isLoggedIn ? {
      rank: 11,
      nickname: this.data.userInfo?.nickname || '德州新星',
      avatar: this.data.userInfo?.avatar || '',
      points: rankings[10]?.points || 0,
      levelName: 'V2 银卡会员'
    } : null;

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

  // 前往登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/ranking/index')
    });
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