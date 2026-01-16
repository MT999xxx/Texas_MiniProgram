/**
 * 邀请奖励API
 */
import { request } from '../utils/request';

const inviteApi = {
    /**
     * 获取当前用户的邀请码
     * @param {string} userId 用户ID
     * @returns {Promise<{success: boolean, inviteCode: string}>}
     */
    getInviteCode(userId) {
        return request({
            url: `/invite/code?userId=${userId}`,
            method: 'GET'
        });
    },

    /**
     * 绑定邀请码
     * @param {string} inviteCode 邀请码
     * @param {string} userId 当前用户ID
     * @returns {Promise<{success: boolean, message: string}>}
     */
    bindInviteCode(inviteCode, userId) {
        return request({
            url: '/invite/bind',
            method: 'POST',
            data: { inviteCode, userId }
        });
    },

    /**
     * 获取已邀请用户列表
     * @param {string} userId 用户ID
     * @returns {Promise<{success: boolean, data: Array}>}
     */
    getInvitedList(userId) {
        return request({
            url: `/invite/list?userId=${userId}`,
            method: 'GET'
        });
    },

    /**
     * 获取邀请统计
     * @param {string} userId 用户ID
     * @returns {Promise<{success: boolean, totalInvited: number, consumedCount: number, totalRewardPoints: number}>}
     */
    getInviteStats(userId) {
        return request({
            url: `/invite/stats?userId=${userId}`,
            method: 'GET'
        });
    }
};

export default inviteApi;
