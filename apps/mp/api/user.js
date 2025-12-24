const {
    api
} = require('../utils/request');

const userApi = {
    // 获取用户信息 (包含积分、等级)
    getProfile: () => api.get('/auth/profile'),

    // 获取充值套餐
    getRechargePackages: () => api.get('/payment/packages'),

    // 创建充值支付
    createRecharge: (packageId, data) => api.post(`/payment/recharge/${packageId}`, data),
};

module.exports = userApi;
