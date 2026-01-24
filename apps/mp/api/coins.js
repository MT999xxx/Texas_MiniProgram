/**
 * 金币与积分 API
 */
const request = require('../utils/request');

// 积分兑换金币汇率：200积分 = 1金币
const POINTS_PER_COIN = 200;

/**
 * 获取余额信息
 */
function getBalance(memberId) {
    return request({
        url: `/coins/balance/${memberId}`,
        method: 'GET'
    });
}

/**
 * 发起金币充值
 * @param {number} amount - 充值金额（元）
 * @param {string} openid - 用户的微信openid
 */
function createRecharge(amount, openid) {
    return request({
        url: '/payment/coin-recharge',
        method: 'POST',
        data: { amount, openid }
    });
}

/**
 * 确认充值（模拟）
 */
function confirmRecharge(orderId) {
    return request({
        url: `/coins/recharge/confirm/${orderId}`,
        method: 'POST'
    });
}

/**
 * 获取充值套餐列表
 */
function getRechargePackages() {
    return request({
        url: '/payment/packages',
        method: 'GET'
    });
}

/**
 * 查询支付状态（同时会触发后端同步微信支付状态）
 */
function getPaymentStatus(paymentId) {
    return request({
        url: `/payment/status/${paymentId}`,
        method: 'GET'
    });
}

/**
 * 积分兑换金币
 */
function exchangeCoins(memberId, coins) {
    return request({
        url: '/coins/exchange',
        method: 'POST',
        data: { memberId, coins }
    });
}

/**
 * 提交存积分申请
 */
function depositPoints(memberId, points) {
    return request({
        url: '/coins/points/deposit',
        method: 'POST',
        data: { memberId, points }
    });
}

/**
 * 取积分
 */
function withdrawPoints(memberId, points) {
    return request({
        url: '/coins/points/withdraw',
        method: 'POST',
        data: { memberId, points }
    });
}

/**
 * 获取交易记录
 */
function getTransactions(memberId) {
    return request({
        url: `/coins/transactions/${memberId}`,
        method: 'GET'
    });
}

/**
 * 获取存积分申请记录
 */
function getDeposits(memberId) {
    return request({
        url: `/coins/points/deposits/${memberId}`,
        method: 'GET'
    });
}

/**
 * 获取签到状态
 */
function getCheckInStatus(memberId) {
    return request({
        url: `/coins/check-in/status/${memberId}`,
        method: 'GET'
    });
}

/**
 * 执行签到
 */
function performCheckIn(memberId) {
    return request({
        url: `/coins/check-in/${memberId}`,
        method: 'POST'
    });
}

module.exports = {
    POINTS_PER_COIN,
    getBalance,
    createRecharge,
    confirmRecharge,
    getRechargePackages,
    getPaymentStatus,
    exchangeCoins,
    depositPoints,
    withdrawPoints,
    getTransactions,
    getDeposits,
    getCheckInStatus,
    performCheckIn
};
