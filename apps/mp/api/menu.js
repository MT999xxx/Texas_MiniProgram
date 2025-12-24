const {
    api
} = require('../utils/request');

const menuApi = {
    // 获取所有分类
    getCategories: () => api.get('/menu/categories'),

    // 获取商品列表
    getGoods: (categoryId) => api.get('/menu/items', { categoryId }),

    // 提交订单
    submitOrder: (data) => api.post('/orders', data)
};

module.exports = menuApi;
