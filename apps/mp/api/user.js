const {
    api
} = require('../utils/request');

const userApi = {
    // 获取用户信息
    getProfile: () => api.get('/auth/profile'),

    // 获取余额信息
    getBalance: () => api.get('/user/balance'),

    // 充值
    recharge: (data) => api.post('/payment/recharge', data),

    // 获取会员等级信息
    getMembership: () => api.get('/membership/current')
};

module.exports = userApi;
