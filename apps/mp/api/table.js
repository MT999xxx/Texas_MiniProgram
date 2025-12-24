const {
    api
} = require('../utils/request');

const tableApi = {
    // 获取桌台列表/状态
    getStatus: () => api.get('/tables'),

    // 获取座位详情 (目前后端容量是数值，直接返回桌位信息即可)
    getSeats: (tableId) => api.get(`/tables/${tableId}`),

    // 预约座位
    reserveSeat: (data) => api.post('/reservations', data),

    // 加入候补
    joinWaitingList: (tableId) => api.post('/tables/waiting-list/join', { tableId })
};

module.exports = tableApi;
