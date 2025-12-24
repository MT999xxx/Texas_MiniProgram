const {
    api
} = require('../utils/request');

const rankingApi = {
    // 获取排行榜列表
    // type: 'total' | 'weekly' | 'event'
    getList: (type = 'total') => api.get('/loyalty/leaderboard', { type }),

    // 获取我的排名
    getMyRank: (memberId, type = 'total') => api.get(`/loyalty/leaderboard/${memberId}`, { type })
};

module.exports = rankingApi;
