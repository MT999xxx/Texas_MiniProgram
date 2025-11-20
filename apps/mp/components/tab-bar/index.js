// components/tab-bar/index.js
Component({
    properties: {
        selected: {
            type: Number,
            value: 0
        }
    },

    data: {
        list: [
            {
                pagePath: "/pages/home/index",
                text: "首页",
                iconPath: "/images/首页图标.png"
            },
            {
                pagePath: "/pages/table/index",
                text: "桌面",
                iconPath: "/images/桌面图标.png"
            },
            {
                pagePath: "/pages/ranking/ranking",
                text: "排行榜",
                iconPath: "/images/排行榜图标.png"
            },
            {
                pagePath: "/pages/member/member",
                text: "会员",
                iconPath: "/images/会员图标.png"
            }
        ]
    },

    methods: {
        switchTab(e) {
            const data = e.currentTarget.dataset;
            const url = data.path;
            const index = data.index;

            // 如果点击的不是当前页，则跳转
            if (this.data.selected !== index) {
                wx.redirectTo({
                    url
                });
            }
        }
    }
})
