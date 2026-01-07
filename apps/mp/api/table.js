const {
    api
} = require('../utils/request');

const tableApi = {
    // 获取桌台列表/状态
    getStatus: () => api.get('/tables'),

    // 获取座位详情 (目前后端容量是数值，直接返回桌位信息即可)
    getSeats: (tableId) => api.get(`/tables/${tableId}`),

    // 获取桌台的预约列表
    getReservations: (tableId) => api.get(`/reservations?tableId=${tableId}`),

    // 获取所有预约列表（返回所有状态，前端过滤）
    getAllReservations: () => api.get('/reservations'),

    // 预约座位
    reserveSeat: (data) => api.post('/reservations', data),

    // 取消预约
    cancelReservation: (reservationId) => api.post(`/reservations/${reservationId}/cancel`),

    // 加入候补
    joinWaitingList: (tableId) => api.post('/tables/waiting-list/join', { tableId })
};



module.exports = tableApi;
