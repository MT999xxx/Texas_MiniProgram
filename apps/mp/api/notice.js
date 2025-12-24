const request = require('../utils/request');

const noticeApi = {
    // 获取最新的公告或活动
    getLatest: (type) => request.get('/notices/latest', { type }),
};

module.exports = noticeApi;
