const {
    api
} = require('../utils/request');

const menuApi = {
    // 获取所有分类
    getCategories: () => api.get('/menu/categories'),

    // 获取商品列表
    getGoods: (categoryId) => api.get('/menu/items', { categoryId }),

    // 提交订单
    submitOrder: (data) => api.post('/orders', data),

    // 金币支付订单
    payWithCoins: (orderId, memberId) => api.post(`/orders/${orderId}/pay-with-coins`, { memberId }),

    // 获取会员金币余额
    getMemberBalance: (memberId) => api.get(`/coins/balance/${memberId}`),

    // 酒卷抵扣鸡尾酒
    payWithWineVouchers: (orderId, memberId, vouchersToUse, cocktailDiscount) =>
        api.post(`/orders/${orderId}/pay-wine-vouchers`, { memberId, vouchersToUse, cocktailDiscount })
};

module.exports = menuApi;
