Component({
    properties: {
        // 形状: circle, line, block
        shape: {
            type: String,
            value: 'block'
        },
        // 是否显示动画
        animate: {
            type: Boolean,
            value: true
        },
        // 自定义样式
        customStyle: {
            type: String,
            value: ''
        }
    }
});
