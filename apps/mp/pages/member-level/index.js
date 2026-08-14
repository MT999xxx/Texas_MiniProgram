const authManager = require('../../utils/auth');
const coinsApi = require('../../api/coins');

const LEVELS = [
  { id: 1, code: 'V1', name: '尊荣白银', threshold: 0, reward: '暂无升级奖励', icon: '/images/membership/v1.jpg', accent: '#c8cbd0' },
  { id: 2, code: 'V2', name: '奢华黄金', threshold: 1000, reward: '赠送 10,000 积分', icon: '/images/membership/v2.jpg', accent: '#e3bd64' },
  { id: 3, code: 'V3', name: '高贵铂金', threshold: 3000, reward: '赠送 20,000 积分', icon: '/images/membership/v3.jpg', accent: '#d7e4ef' },
  { id: 4, code: 'V4', name: '巅峰钻石', threshold: 10000, reward: '赠送 30,000 积分、1 张酒券', icon: '/images/membership/v4.jpg', accent: '#b9d9f5' },
  { id: 5, code: 'V5', name: '星耀黑金', threshold: 20000, reward: '赠送 40,000 积分、100 金币、1 张酒券', icon: '/images/membership/v5.jpg', accent: '#e6c678' },
  { id: 6, code: 'V6', name: '传奇大师', threshold: 30000, reward: '赠送 50,000 积分、100 金币、2 张酒券', icon: '/images/membership/v6.jpg', accent: '#d85d55' },
  { id: 7, code: 'V7', name: '耀金尊客', threshold: 40000, reward: '赠送 60,000 积分、100 金币、3 张酒券、1 张月赛门票', icon: '/images/membership/v7.jpg', accent: '#f0c75e' },
  { id: 8, code: 'V8', name: '至尊领主', threshold: 50000, reward: '赠送 70,000 积分、200 金币、5 张酒券、1 张月赛门票', icon: '/images/membership/v8.jpg', accent: '#4d78c9' },
  { id: 9, code: 'V9', name: '典藏尊主', threshold: 60000, reward: '赠送 80,000 积分、300 金币、6 张酒券、1 张月赛门票', icon: '/images/membership/v9.jpg', accent: '#4ca87a' },
  { id: 10, code: 'V10', name: '最强尊主', threshold: 70000, reward: '赠送 100,000 积分、300 金币、8 张酒券、1 张月赛门票', icon: '/images/membership/v10.jpg', accent: '#c84d42' },
];

Page({
  data: {
    currentLevel: 0,
    actualLevel: 1,
    memberLevels: LEVELS.map((item, index) => ({
      ...item,
      status: index === 0 ? '当前起点' : '未解锁',
    })),
  },

  onLoad() {
    authManager.loadAuth();
    const user = authManager.getUserInfo();
    const memberId = user?.memberId || user?.id;
    if (!memberId) return;
    coinsApi.getBalance(memberId)
      .then((balance) => this.applyMemberProgress(balance))
      .catch(() => undefined);
  },

  applyMemberProgress(balance) {
    const actualLevel = Math.min(10, Math.max(1, parseInt(String(balance.levelCode || 'V1').replace('V', ''), 10) || 1));
    const memberLevels = LEVELS.map((item) => ({
      ...item,
      status: item.id < actualLevel ? '已解锁' : item.id === actualLevel ? '当前等级' : '未解锁',
    }));
    this.setData({
      actualLevel,
      currentLevel: actualLevel - 1,
      memberLevels,
    });
  },

  onSwiperChange(e) {
    this.setData({ currentLevel: e.detail.current });
  },

  onIndicatorTap(e) {
    this.setData({ currentLevel: Number(e.currentTarget.dataset.index) });
  },

  goRecharge() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/member/index' }),
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
