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
                iconPath: "/images/shouye2.jpg"
            },
            {
                pagePath: "/pages/table/index",
                text: "桌面",
                iconPath: "/images/zhuomian2.jpg"
            },
            {
                pagePath: "/pages/ranking/index",
                text: "排行榜",
                iconPath: "/images/paihangbang2.jpg"
            },
            {
                pagePath: "/pages/member/index",
                text: "会员",
                iconPath: "/images/huiyuan2.jpg"
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
