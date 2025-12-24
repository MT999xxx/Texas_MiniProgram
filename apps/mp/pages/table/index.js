// pages/table/index.js
const app = getApp();
const tableApi = require('../../api/table');
const authManager = require('../../utils/auth');

Page({
    data: {
        // CDN或本地图片地址
        tableBgUrl: app.globalData.cdnBase
            ? `${app.globalData.cdnBase}/table_bg.png`
            : '/images/圆桌背景2.png',
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
     * 加载桌台数据
     */
    async loadTableData() {
        try {
            const res = await tableApi.getStatus();
            // 假设后端返回结构: { mainTable: {...}, subTable: {...}, seats: [], subSeats: [] }
            // 这里做简单Mock适配

            if (res && Array.isArray(res)) {
                const main = res.find(t => t.category === 'MAIN');
                const side = res.find(t => t.category === 'SIDE');

                this.setData({
                    mainTable: main ? {
                        id: main.id,
                        name: main.name,
                        status: main.status === 'AVAILABLE' ? '可预约' : '进行中',
                        occupied: 0, // 暂时没有实时人数，使用模拟或0
                        total: main.capacity,
                        updateTime: new Date().toLocaleTimeString()
                    } : this.data.mainTable,
                    subTable: side ? {
                        id: side.id,
                        name: side.name,
                        status: side.status === 'AVAILABLE' ? '可预约' : '进行中',
                        occupied: 0,
                        total: side.capacity,
                        updateTime: new Date().toLocaleTimeString()
                    } : this.data.subTable,
                });
            }
        } catch (error) {
            console.error('加载桌台信息失败', error);
            // Fallback: 如果是第一次加载且失败，使用默认Mock数据展示
            if (this.data.mainTable.status === '加载中') {
                this.useMockData();
            }
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
                name: '主赛事桌',
                updateTime: '08:32:01',
                status: '进行中',
                score: '20/40',
                occupied: 6,
                total: 9
            },
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
            subTable: {
                name: '副赛事桌',
                updateTime: '08:32:01',
                status: '进行中',
                score: '20/40',
                occupied: 0,
                total: 9
            },
            waitingList: ['/images/会员图标.png', '/images/会员图标.png']
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
            // 预约
            this.reserveSeat(seatArray, seatindex, userName, userInfo);
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
     * 预约座位
     */
    async reserveSeat(seatArray, seatIndex, userName, userInfo) {
        wx.showLoading({ title: '预约中' });

        try {
            // 调用API
            await tableApi.reserveSeat({
                tableType: seatArray === 'seats' ? 'main' : 'sub',
                seatIndex: seatIndex + 1
            });

            wx.hideLoading();
            wx.showToast({ title: '预约成功', icon: 'success' });

            // 刷新数据
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
                avatar: userInfo?.avatar || '/images/会员图标.png',
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
        wx.showModal({
            title: '提示',
            content: '确定取消预约吗？',
            success: async (res) => {
                if (res.confirm) {
                    // TODO: API call
                    // await tableApi.cancelReservation(...)

                    // Mock update
                    const seats = this.data[seatArray];
                    seats[seatIndex] = {
                        ...seats[seatIndex],
                        status: 'empty',
                        name: '',
                        avatar: '',
                        userId: null
                    };
                    this.setData({ [seatArray]: seats });
                    wx.showToast({ title: '已取消预约', icon: 'success' });
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
    }
});
