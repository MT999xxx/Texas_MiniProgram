Component({
    properties: {
        // 提示图标类型: box, list, coupon, search
        type: {
            type: String,
            value: 'box'
        },
        // 提示文字
        text: {
            type: String,
            value: '暂无数据'
        },
        // 说明文字
        description: {
            type: String,
            value: ''
        }
    }
});
