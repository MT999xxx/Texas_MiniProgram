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
                iconPath: "/images/icons/home-muted.svg",
                selectedIconPath: "/images/icons/home-red.svg"
            },
            {
                pagePath: "/pages/table/index",
                text: "桌台",
                iconPath: "/images/icons/tables-muted.svg",
                selectedIconPath: "/images/icons/tables-red.svg",
                hidden: true
            },
            {
                pagePath: "/pages/ranking/index",
                text: "排行",
                iconPath: "/images/icons/rank-muted.svg",
                selectedIconPath: "/images/icons/rank-red.svg"
            },
            {
                pagePath: "/pages/member/index",
                text: "我的",
                iconPath: "/images/icons/me-muted.svg",
                selectedIconPath: "/images/icons/me-red.svg"
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
