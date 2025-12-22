const {
    api
} = require('../utils/request');

const rankingApi = {
    // 获取排行榜列表
    // type: 'monthly' | 'yearly' | 'champion'
    getList: (type) => api.get('/ranking/list', { type }),

    // 获取我的排名
    getMyRank: (type) => api.get('/ranking/my-rank', { type })
};

module.exports = rankingApi;
