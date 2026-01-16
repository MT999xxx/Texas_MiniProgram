/**
 * 会员等级权益页面
 * 展示四个会员等级及其对应福利
 */
Page({
    data: {
        currentLevel: 0, // 当前选中的等级索引
        memberLevels: [
            {
                id: 1,
                name: '尊荣白银',
                requirement: '充值500元',
                status: '已解锁',
                progress: '',
                color: '#7a7a7a',
                darkText: true,
                bgGradient: 'linear-gradient(135deg, #ffffff 0%, #e6e6e6 100%)',
                benefits: [
                    { icon: '💰', text: '签到积分' },
                    { icon: '🍿', text: '月度小吃券' },
                    { icon: '🍷', text: '专属酒杯' },
                    { icon: '🤖', text: 'AI挑战' },
                    { icon: '🎁', text: '3000积分' },
                    { icon: '🎟️', text: '更多奖励...' }
                ]
            },
            {
                id: 2,
                name: '奢华黄金',
                requirement: '充值1000元',
                status: '未解锁',
                progress: '成长值还需 500',
                color: '#2e4d2e',
                darkText: true,
                bgGradient: 'linear-gradient(135deg, #e0f2e0 0%, #c4e3c4 100%)',
                benefits: [
                    { icon: '💰', text: '签到积分' },
                    { icon: '🍿', text: '月度小吃券' },
                    { icon: '🍷', text: '专属酒杯' },
                    { icon: '🤖', text: 'AI挑战' },
                    { icon: '🎁', text: '20000积分' },
                    { icon: '🎟️', text: '更多奖励...' }
                ]
            },
            {
                id: 3,
                name: '高贵铂金',
                requirement: '充值3000元',
                status: '未解锁',
                progress: '成长值还需 1000',
                color: '#2e3a4d',
                darkText: true,
                bgGradient: 'linear-gradient(135deg, #e0f0f2 0%, #c4dee3 100%)',
                benefits: [
                    { icon: '💰', text: '签到积分' },
                    { icon: '🍿', text: '月度小吃券' },
                    { icon: '🍷', text: '专属酒杯' },
                    { icon: '🤖', text: 'AI挑战' },
                    { icon: '🍺', text: '免费啤酒' },
                    { icon: '🎁', text: '更多奖励...' }
                ]
            },
            {
                id: 4,
                name: '巅峰钻石',
                requirement: '充值8000元',
                status: '未解锁',
                progress: '成长值还需 5000',
                color: '#4d2e4d',
                darkText: true,
                bgGradient: 'linear-gradient(135deg, #f2e0f2 0%, #e3c4e3 100%)',
                benefits: [
                    { icon: '💰', text: '签到积分' },
                    { icon: '🍿', text: '月度小吃券' },
                    { icon: '🍷', text: '专属酒杯' },
                    { icon: '🤖', text: 'AI挑战' },
                    { icon: '💆', text: '足疗券' },
                    { icon: '🍸', text: '免费调酒' },
                    { icon: '🎟️', text: '更多奖励...' }
                ]
            }
        ]
    },

    onLoad() {
        // 可从后端获取用户当前等级
    },

    /**
     * 切换等级卡片
     */
    onSwiperChange(e) {
        this.setData({
            currentLevel: e.detail.current
        });
    },

    /**
     * 点击等级指示器
     */
    onIndicatorTap(e) {
        const index = e.currentTarget.dataset.index;
        this.setData({
            currentLevel: index
        });
    },

    /**
     * 立即充值
     */
    goRecharge() {
        wx.navigateTo({
            url: '/pages/member/index'
        });
    },

    /**
     * 返回
     */
    goBack() {
        wx.navigateBack();
    }
});
