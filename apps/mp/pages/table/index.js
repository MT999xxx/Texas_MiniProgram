// pages/table/index.js
const app = getApp();

Page({
    data: {
        // 主赛事桌信息
        mainTable: {
            name: '主赛事桌',
            updateTime: '08:32:01',
            status: '进行中',
            score: '20/40',
            occupied: 6,
            total: 9
        },
        // 座位数据 (9个座位)
        // status: 'empty' | 'reserved' | 'playing'
        seats: [
            { id: 1, status: 'reserved', name: '正男70...', avatar: '/images/会员图标.png', seatNum: 1 },
            { id: 2, status: 'playing', name: '阿威', avatar: '/images/会员图标.png', seatNum: 2 },
            { id: 3, status: 'empty', name: '', avatar: '', seatNum: 3 },
            { id: 4, status: 'reserved', name: '宝宝', avatar: '/images/会员图标.png', seatNum: 4 },
            { id: 5, status: 'empty', name: '', avatar: '', seatNum: 5 },
            { id: 6, status: 'reserved', name: 'xx', avatar: '/images/会员图标.png', seatNum: 6 },
            { id: 7, status: 'reserved', name: '已预约', avatar: '/images/会员图标.png', seatNum: 7 },
            { id: 8, status: 'empty', name: '', avatar: '', seatNum: 8 },
            { id: 9, status: 'reserved', name: 'MikeC...', avatar: '/images/会员图标.png', seatNum: 9 },
        ],
        // 副赛事桌信息
        subTable: {
            name: '副赛事桌',
            updateTime: '08:32:01',
            status: '进行中',
            score: '20/40',
            occupied: 0,
            total: 9
        },
        // 副赛事桌座位数据 (9个座位，全空示例)
        subSeats: [
            { id: 1, status: 'empty', name: '', avatar: '', seatNum: 1 },
            { id: 2, status: 'empty', name: '', avatar: '', seatNum: 2 },
            { id: 3, status: 'empty', name: '', avatar: '', seatNum: 3 },
            { id: 4, status: 'empty', name: '', avatar: '', seatNum: 4 },
            { id: 5, status: 'empty', name: '', avatar: '', seatNum: 5 },
            { id: 6, status: 'empty', name: '', avatar: '', seatNum: 6 },
            { id: 7, status: 'empty', name: '', avatar: '', seatNum: 7 },
            { id: 8, status: 'empty', name: '', avatar: '', seatNum: 8 },
            { id: 9, status: 'empty', name: '', avatar: '', seatNum: 9 },
        ],
        // 候补列表头像 (模拟)
        waitingList: [
            '/images/会员图标.png',
            '/images/会员图标.png',
            '/images/会员图标.png'
        ],
        showRulesPopup: false, // 控制规则弹窗显示
        currentUser: null, // 当前登录用户信息
    },

    onLoad: function (options) {
        // 获取当前用户信息
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
            this.setData({
                currentUser: userInfo
            });
        }
    },

    /**
     * 处理座位点击
     * @param {Object} e - 事件对象
     */
    handleSeatClick: function (e) {
        const { seatindex, tabletype } = e.currentTarget.dataset;
        const seatArray = tabletype === 'main' ? 'seats' : 'subSeats';
        const seat = this.data[seatArray][seatindex];

        // 如果是游戏中状态，不允许操作
        if (seat.status === 'playing') {
            wx.showToast({
                title: '该座位游戏中',
                icon: 'none'
            });
            return;
        }

        // 检查登录状态
        const token = wx.getStorageSync('token');
        if (!token) {
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                duration: 2000
            });
            // 跳转到登录页面
            setTimeout(() => {
                wx.navigateTo({
                    url: '/pages/login/index'
                });
            }, 2000);
            return;
        }

        const userInfo = this.data.currentUser || wx.getStorageSync('userInfo');
        const userName = userInfo?.name || userInfo?.nickName || '用户';
        const userId = userInfo?.id;

        // 判断操作类型
        if (seat.status === 'empty') {
            // 空座 -> 检查是否已有预约
            const hasReservation = this.checkUserHasReservation(userId, userName);
            if (hasReservation) {
                wx.showModal({
                    title: '提示',
                    content: '您已有预约座位，预约新座位将自动取消之前的预约。是否继续？',
                    confirmText: '继续预约',
                    cancelText: '取消',
                    success: (res) => {
                        if (res.confirm) {
                            // 先取消旧预约
                            this.cancelAllUserReservations(userId, userName);
                            // 再预约新座位
                            this.reserveSeat(seatArray, seatindex, userName, userInfo);
                        }
                    }
                });
            } else {
                // 直接预约
                this.reserveSeat(seatArray, seatindex, userName, userInfo);
            }
        } else if (seat.status === 'reserved') {
            // 已预约 -> 检查是否是自己的预约
            if (seat.name === userName || seat.userId === userId) {
                // 取消预约
                this.cancelReservation(seatArray, seatindex);
            } else {
                wx.showToast({
                    title: '该座位已被预约',
                    icon: 'none'
                });
            }
        }
    },

    /**
     * 检查用户是否已有预约
     */
    checkUserHasReservation: function (userId, userName) {
        // 检查主桌
        const mainReserved = this.data.seats.some(seat =>
            seat.status === 'reserved' &&
            (seat.userId === userId || seat.name === userName)
        );

        // 检查副桌
        const subReserved = this.data.subSeats.some(seat =>
            seat.status === 'reserved' &&
            (seat.userId === userId || seat.name === userName)
        );

        return mainReserved || subReserved;
    },

    /**
     * 取消用户的所有预约
     */
    cancelAllUserReservations: function (userId, userName) {
        // 取消主桌预约
        const seats = this.data.seats.map(seat => {
            if (seat.status === 'reserved' && (seat.userId === userId || seat.name === userName)) {
                return {
                    ...seat,
                    status: 'empty',
                    name: '',
                    avatar: '',
                    userId: null
                };
            }
            return seat;
        });

        // 取消副桌预约
        const subSeats = this.data.subSeats.map(seat => {
            if (seat.status === 'reserved' && (seat.userId === userId || seat.name === userName)) {
                return {
                    ...seat,
                    status: 'empty',
                    name: '',
                    avatar: '',
                    userId: null
                };
            }
            return seat;
        });

        this.setData({ seats, subSeats });
    },

    /**
     * 预约座位
     */
    reserveSeat: function (seatArray, seatIndex, userName, userInfo) {
        // 乐观更新UI
        const seats = this.data[seatArray];
        seats[seatIndex] = {
            ...seats[seatIndex],
            status: 'reserved',
            name: userName,
            avatar: userInfo?.avatar || '/images/会员图标.png',
            userId: userInfo?.id
        };
        this.setData({
            [seatArray]: seats
        });

        wx.showToast({
            title: '预约成功',
            icon: 'success'
        });

        // TODO: 调用后端API保存预约
        // const request = require('../../utils/request.js');
        // request.post('/reservations', {
        //   seatId: seats[seatIndex].id,
        //   tableType: seatArray === 'seats' ? 'main' : 'sub'
        // }).catch(err => {
        //   // 失败则回滚
        //   seats[seatIndex] = { ...seats[seatIndex], status: 'empty', name: '', avatar: '', userId: null };
        //   this.setData({ [seatArray]: seats });
        //   wx.showToast({ title: '预约失败', icon: 'none' });
        // });
    },

    /**
     * 取消预约
     */
    cancelReservation: function (seatArray, seatIndex) {
        wx.showModal({
            title: '提示',
            content: '确定取消预约吗？',
            success: (res) => {
                if (res.confirm) {
                    // 乐观更新UI
                    const seats = this.data[seatArray];
                    seats[seatIndex] = {
                        ...seats[seatIndex],
                        status: 'empty',
                        name: '',
                        avatar: '',
                        userId: null
                    };
                    this.setData({
                        [seatArray]: seats
                    });

                    wx.showToast({
                        title: '已取消预约',
                        icon: 'success'
                    });

                    // TODO: 调用后端API取消预约
                    // const request = require('../../utils/request.js');
                    // request.delete(`/reservations/${reservationId}`)
                    //   .catch(err => {
                    //     wx.showToast({ title: '取消失败', icon: 'none' });
                    //   });
                }
            }
        });
    },

    /**
     * 显示规则弹窗
     */
    showRules: function () {
        this.setData({
            showRulesPopup: true
        });
    },

    /**
     * 隐藏规则弹窗
     */
    hideRules: function () {
        this.setData({
            showRulesPopup: false
        });
    },

    // 底部导航栏点击处理
    switchTab: function (e) {
        // 确保 index 是数字
        const index = parseInt(e.currentTarget.dataset.index);
        const urls = [
            '/pages/home/index',      // 0: 首页
            '/pages/table/index',     // 1: 桌面
            '/pages/ranking/index',   // 2: 排行榜
            '/pages/member/index'     // 3: 会员
        ];

        if (index !== 1) {
            wx.redirectTo({ url: urls[index] });
        }
    }
});
