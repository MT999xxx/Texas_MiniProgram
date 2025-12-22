const {
    api
} = require('../utils/request');

const tableApi = {
    // 获取桌台列表/状态
    getStatus: () => api.get('/tables/status'),

    // 获取座位详情
    getSeats: (tableId) => api.get(`/tables/${tableId}/seats`),

    // 预约座位
    reserveSeat: (data) => api.post('/reservation/create', data),

    // 加入候补
    joinWaitingList: (tableId) => api.post('/tables/waiting-list/join', { tableId })
};

module.exports = tableApi;
