// pages/table/index.js
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
        showRulesPopup: false // 控制规则弹窗显示
    },

    onLoad: function (options) {
        // 页面加载逻辑
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
