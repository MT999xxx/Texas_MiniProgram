const MEMBERSHIP_LEVELS = [
  { code: 'VP', level: 0, name: '三条A合伙人', icon: '/images/membership/v10.jpg' },
  { code: 'V1', level: 1, name: '尊荣白银', icon: '/images/membership/v1.jpg' },
  { code: 'V2', level: 2, name: '奢华黄金', icon: '/images/membership/v2.jpg' },
  { code: 'V3', level: 3, name: '高贵铂金', icon: '/images/membership/v3.jpg' },
  { code: 'V4', level: 4, name: '巅峰钻石', icon: '/images/membership/v4.jpg' },
  { code: 'V5', level: 5, name: '星耀黑金', icon: '/images/membership/v5.jpg' },
  { code: 'V6', level: 6, name: '传奇大师', icon: '/images/membership/v6.jpg' },
  { code: 'V7', level: 7, name: '耀金尊客', icon: '/images/membership/v7.jpg' },
  { code: 'V8', level: 8, name: '至尊领主', icon: '/images/membership/v8.jpg' },
  { code: 'V9', level: 9, name: '典藏尊主', icon: '/images/membership/v9.jpg' },
  { code: 'V10', level: 10, name: '最强尊主', icon: '/images/membership/v10.jpg' }
];

function getMembershipLevel(levelCode) {
  const normalizedCode = String(levelCode || '').toUpperCase();
  return MEMBERSHIP_LEVELS.find(item => item.code === normalizedCode)
    || MEMBERSHIP_LEVELS.find(item => item.code === 'V1');
}

module.exports = {
  MEMBERSHIP_LEVELS,
  getMembershipLevel
};
