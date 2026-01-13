// pages/table/index.js
const app = getApp();
const tableApi = require('../../api/table');
const authManager = require('../../utils/auth');

Page({
    data: {
        // 本地圆桌背景图片
        tableBgUrl: '/images/table_bg.jpg',
        // 主赛事桌信息
        mainTable: {
            name: '主赛事桌',
            updateTime: '--:--:--',
            status: '加载中',
            score: '0/0',
            occupied: 0,
            total: 9
        },
        // 座位数据 (9个座位)
        // status: 'empty' | 'reserved' | 'playing'
        seats: Array(9).fill(0).map((_, i) => ({ id: i + 1, status: 'empty', name: '', avatar: '', seatNum: i + 1 })),

        // 副赛事桌信息
        subTable: {
            name: '副赛事桌',
            updateTime: '--:--:--',
            status: '加载中',
            score: '0/0',
            occupied: 0,
            total: 9
        },
        // 副赛事桌座位数据
        subSeats: Array(9).fill(0).map((_, i) => ({ id: i + 1, status: 'empty', name: '', avatar: '', seatNum: i + 1 })),

        // 候补列表头像
        waitingList: [],
        showRulesPopup: false, // 控制规则弹窗显示
        currentUser: null, // 当前登录用户信息
        loading: false
    },

    onLoad: function (options) {
        // 获取当前用户信息
        this.updateUserInfo();
        this.loadTableData();
    },

    onShow: function () {
        this.updateUserInfo();
        // 每次显示刷新数据
        this.loadTableData();

        // 可以开启定时刷新
        // this.timer = setInterval(() => this.loadTableData(), 10000);
    },

    onHide: function () {
        // if (this.timer) clearInterval(this.timer);
    },

    onUnload: function () {
        // if (this.timer) clearInterval(this.timer);
    },

    updateUserInfo() {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
            this.setData({ currentUser: userInfo });
        }
    },

    /**
     * 头像加载失败时使用默认头像
     */
    onAvatarError(e) {
        const { seatindex, tabletype } = e.currentTarget.dataset;
        const seatArray = tabletype === 'main' ? 'seats' : 'subSeats';
        const key = `${seatArray}[${seatindex}].avatar`;
        this.setData({
            [key]: '/images/huiyuan2.jpg'
        });
    },

    /**
     * 加载桌台数据
     */
    async loadTableData() {
        try {
            console.log('正在加载桌台数据...');
            const res = await tableApi.getStatus();
            console.log('桌台API返回:', res);

            // 假设后端返回结构: { mainTable: {...}, subTable: {...}, seats: [], subSeats: [] }
            // 这里做简单Mock适配

            if (res && Array.isArray(res) && res.length > 0) {
                const main = res.find(t => t.category === 'MAIN');
                const side = res.find(t => t.category === 'SIDE');

                console.log('主桌:', main);
                console.log('副桌:', side);

                // 如果找不到 MAIN/SIDE 类型，尝试使用第一个/第二个桌台
                const mainTable = main || res[0];
                const sideTable = side || res[1];

                this.setData({
                    mainTable: mainTable ? {
                        id: mainTable.id,
                        name: mainTable.name || '主赛事桌',
                        status: mainTable.status === 'AVAILABLE' ? '可预约' : '进行中',
                        occupied: 0, // 暂时没有实时人数，使用模拟或0
                        total: mainTable.capacity || 9,
                        updateTime: new Date().toLocaleTimeString()
                    } : this.data.mainTable,
                    subTable: sideTable ? {
                        id: sideTable.id,
                        name: sideTable.name || '副赛事桌',
                        status: sideTable.status === 'AVAILABLE' ? '可预约' : '进行中',
                        occupied: 0,
                        total: sideTable.capacity || 9,
                        updateTime: new Date().toLocaleTimeString()
                    } : this.data.subTable,
                });

                // 加载预约信息并更新座位状态
                await this.loadReservations(mainTable?.id, sideTable?.id);
            } else {
                console.log('API返回数据为空或格式不正确，使用Mock数据');
                this.useMockData();
            }
        } catch (error) {
            console.error('加载桌台信息失败', error);
            // Fallback: 如果是第一次加载且失败，使用默认Mock数据展示
            this.useMockData();
        }
    },

    /**
     * 加载预约信息并更新座位状态
     */
    async loadReservations(mainTableId, sideTableId) {
        try {
            // 获取所有有效预约
            const reservations = await tableApi.getAllReservations();
            console.log('预约列表:', reservations);

            if (!reservations || !Array.isArray(reservations)) {
                console.log('没有预约数据');
                return;
            }

            // 初始化空座位
            const mainSeats = Array(9).fill(0).map((_, i) => ({
                id: i + 1,
                status: 'empty',
                name: '',
                avatar: '',
                seatNum: i + 1
            }));
            const subSeats = Array(9).fill(0).map((_, i) => ({
                id: i + 1,
                status: 'empty',
                name: '',
                avatar: '',
                seatNum: i + 1
            }));

            // 只处理 PENDING 和 CONFIRMED 状态的预约
            const activeReservations = reservations.filter(r =>
                r.status === 'PENDING' || r.status === 'CONFIRMED'
            );
            console.log('有效预约数量:', activeReservations.length);

            // 根据预约更新座位状态
            activeReservations.forEach(reservation => {

                const seatNumber = reservation.seatNumber;
                if (!seatNumber || seatNumber < 1 || seatNumber > 9) return;

                const seatIndex = seatNumber - 1;
                const seatData = {
                    id: seatNumber,
                    status: 'reserved',
                    name: reservation.member?.nickname || reservation.customerName || '已预约',
                    avatar: reservation.member?.avatar || reservation.avatar || '/images/huiyuan2.jpg',
                    seatNum: seatNumber,
                    userId: reservation.member?.id || reservation.memberId,
                    reservationId: reservation.id
                };

                // 根据桌台ID分配到对应座位
                if (reservation.table?.id === mainTableId || reservation.tableId === mainTableId) {
                    mainSeats[seatIndex] = seatData;
                } else if (reservation.table?.id === sideTableId || reservation.tableId === sideTableId) {
                    subSeats[seatIndex] = seatData;
                }
            });

            // 更新座位数据
            this.setData({
                seats: mainSeats,
                subSeats: subSeats
            });

            // 更新占用数量
            const mainOccupied = mainSeats.filter(s => s.status !== 'empty').length;
            const subOccupied = subSeats.filter(s => s.status !== 'empty').length;
            this.setData({
                'mainTable.occupied': mainOccupied,
                'subTable.occupied': subOccupied
            });

            console.log('座位状态已更新:', { mainSeats, subSeats });
        } catch (error) {
            console.error('加载预约信息失败:', error);
        }
    },


    mergeSeats(currentSeats, apiSeats) {
        if (!apiSeats) return currentSeats;
        // 简单合并逻辑，实际根据后端ID匹配
        return currentSeats.map((seat, index) => {
            const apiSeat = apiSeats[index] || {};
            return {
                ...seat,
                status: apiSeat.status || 'empty',
                name: apiSeat.nickname || '',
                avatar: apiSeat.avatar || '',
                userId: apiSeat.userId
            };
        });
    },

    useMockData() {
        this.setData({
            mainTable: {
                id: 'mock-main-table',  // Mock ID for reservation
                name: '主赛事桌',
                updateTime: new Date().toLocaleTimeString(),
                status: '可预约',
                score: '20/40',
                occupied: 6,
                total: 9
            },
            seats: [
                { id: 1, status: 'reserved', name: '正男70...', avatar: '/images/huiyuan2.jpg', seatNum: 1 },
                { id: 2, status: 'playing', name: '阿威', avatar: '/images/huiyuan2.jpg', seatNum: 2 },
                { id: 3, status: 'empty', name: '', avatar: '', seatNum: 3 },
                { id: 4, status: 'reserved', name: '宝宝', avatar: '/images/huiyuan2.jpg', seatNum: 4 },
                { id: 5, status: 'empty', name: '', avatar: '', seatNum: 5 },
                { id: 6, status: 'reserved', name: 'xx', avatar: '/images/huiyuan2.jpg', seatNum: 6 },
                { id: 7, status: 'reserved', name: '已预约', avatar: '/images/huiyuan2.jpg', seatNum: 7 },
                { id: 8, status: 'empty', name: '', avatar: '', seatNum: 8 },
                { id: 9, status: 'reserved', name: 'MikeC...', avatar: '/images/huiyuan2.jpg', seatNum: 9 },
            ],
            subTable: {
                id: 'mock-side-table',  // Mock ID for reservation
                name: '副赛事桌',
                updateTime: new Date().toLocaleTimeString(),
                status: '可预约',
                score: '20/40',
                occupied: 0,
                total: 9
            },
            waitingList: ['/images/huiyuan2.jpg', '/images/huiyuan2.jpg']
        });
    },

    /**
     * 处理座位点击
     */
    async handleSeatClick(e) {
        const { seatindex, tabletype } = e.currentTarget.dataset;
        const seatArray = tabletype === 'main' ? 'seats' : 'subSeats';
        const seat = this.data[seatArray][seatindex];

        if (seat.status === 'playing') {
            wx.showToast({ title: '该座位游戏中', icon: 'none' });
            return;
        }

        // 检查登录
        const isLoggedIn = await authManager.checkLogin();
        if (!isLoggedIn) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            setTimeout(() => {
                wx.navigateTo({ url: '/pages/login/index' });
            }, 1000);
            return;
        }

        const userInfo = authManager.getUserInfo();
        const userName = userInfo?.nickname || '我';
        const userId = userInfo?.id;

        // 判断操作类型
        if (seat.status === 'empty') {
            // 检查是否已有预约（防止重复预约）
            const seats = this.data[seatArray];
            const existingReservation = seats.find(s =>
                s.status === 'reserved' && (s.userId === userId || s.name === userName)
            );
            if (existingReservation) {
                wx.showModal({
                    title: '已有预约',
                    content: `你已预约了${existingReservation.seatNum}号位，每人限预约一个座位。是否取消原预约并预约新座位？`,
                    confirmText: '换座位',
                    cancelText: '保持原位',
                    success: (res) => {
                        if (res.confirm) {
                            // 取消原预约
                            const oldIndex = seats.findIndex(s => s.id === existingReservation.id);
                            this.cancelReservationAndRebook(seatArray, oldIndex, seatindex, userName, userInfo, tabletype);
                        }
                    }
                });
                return;
            }
            // 预约
            this.reserveSeat(seatArray, seatindex, userName, userInfo, tabletype);
        } else if (seat.status === 'reserved') {
            // 取消 (判断是否本人)
            // 这里简单判断，实际应校验ID
            if (seat.userId === userId || seat.name === userName) {
                this.cancelReservation(seatArray, seatindex);
            } else {
                wx.showToast({ title: '该座位已被预约', icon: 'none' });
            }
        }
    },

    /**
     * 取消原预约并预约新座位
     */
    async cancelReservationAndRebook(seatArray, oldIndex, newIndex, userName, userInfo, tabletype) {
        wx.showLoading({ title: '换座中' });

        try {
            // 获取旧座位的预约ID
            const seats = this.data[seatArray];
            const oldSeat = seats[oldIndex];

            if (oldSeat.reservationId) {
                // 先调用服务器取消旧预约
                await tableApi.cancelReservation(oldSeat.reservationId);
                console.log('旧预约已取消:', oldSeat.reservationId);
            }

            // 更新本地旧座位状态
            seats[oldIndex] = {
                ...seats[oldIndex],
                status: 'empty',
                name: '',
                avatar: '',
                userId: null,
                reservationId: null
            };
            this.setData({ [seatArray]: seats });

            wx.hideLoading();

            // 预约新座位
            this.reserveSeat(seatArray, newIndex, userName, userInfo, tabletype);
        } catch (error) {
            wx.hideLoading();
            console.error('换座失败:', error);
            wx.showToast({ title: error.message || '换座失败', icon: 'none' });
        }
    },


    /**
     * 预约座位
     */
    async reserveSeat(seatArray, seatIndex, userName, userInfo, tabletype) {
        wx.showLoading({ title: '预约中' });

        try {
            // 获取当前桌台ID
            const tableId = tabletype === 'main' ? this.data.mainTable.id : this.data.subTable.id;

            if (!tableId) {
                wx.showToast({ title: '桌台信息错误', icon: 'none' });
                return;
            }

            // 调用API
            await tableApi.reserveSeat({
                customerName: userInfo?.nickname || userInfo?.nickName || userInfo?.name || '微信用户',
                phone: userInfo?.phone || '13888888888', // 如果没设置手机号，暂用默认
                partySize: 1,
                tableId: tableId,
                reservedAt: new Date().toISOString(),
                seatNumber: seatIndex + 1,
                avatar: userInfo?.avatar || userInfo?.avatarUrl,  // 发送头像URL
                memberId: userInfo?.id
            });

            wx.hideLoading();
            wx.showToast({ title: '预约成功', icon: 'success' });

            // 立即更新本地座位状态（乐观更新）
            const seats = this.data[seatArray];
            seats[seatIndex] = {
                ...seats[seatIndex],
                status: 'reserved',
                name: userName,
                avatar: userInfo?.avatar || '/images/huiyuan2.jpg',
                userId: userInfo?.id
            };
            this.setData({ [seatArray]: seats });

            // 刷新数据（同步后端最新状态）
            this.loadTableData();

        } catch (error) {
            wx.hideLoading();
            console.error('预约失败', error);

            // Fallback Mock (仅演示)
            const seats = this.data[seatArray];
            seats[seatIndex] = {
                ...seats[seatIndex],
                status: 'reserved',
                name: userName,
                avatar: userInfo?.avatar || '/images/huiyuan2.jpg',
                userId: userInfo?.id
            };
            this.setData({ [seatArray]: seats });
            wx.showToast({ title: '预约成功(Mock)', icon: 'none' });
        }
    },

    /**
     * 取消预约
     */
    cancelReservation(seatArray, seatIndex) {
        const seat = this.data[seatArray][seatIndex];

        wx.showModal({
            title: '提示',
            content: '确定取消预约吗？',
            success: async (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '取消中' });

                    try {
                        // 调用服务器取消预约
                        if (seat.reservationId) {
                            await tableApi.cancelReservation(seat.reservationId);
                            console.log('预约已取消:', seat.reservationId);
                        }

                        // 更新本地状态
                        const seats = this.data[seatArray];
                        seats[seatIndex] = {
                            ...seats[seatIndex],
                            status: 'empty',
                            name: '',
                            avatar: '',
                            userId: null,
                            reservationId: null
                        };
                        this.setData({ [seatArray]: seats });

                        wx.hideLoading();
                        wx.showToast({ title: '已取消预约', icon: 'success' });
                    } catch (error) {
                        wx.hideLoading();
                        console.error('取消预约失败:', error);
                        wx.showToast({ title: error.message || '取消失败', icon: 'none' });
                    }
                }
            }
        });
    },


    /**
     * 检查用户是否已有预约
     */
    checkUserHasReservation: function (userId, userName) {
        // ... (保留原有逻辑或交给后端判断)
        return false;
    },

    /**
     * 取消用户的所有预约
     */
    cancelAllUserReservations: function (userId, userName) {
        // ... (保留原有逻辑)
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
    },
    stopBubble() { }
});
