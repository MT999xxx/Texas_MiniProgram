/**
 * 动画显示数字
 * @param {Object} page 页面实例
 * @param {String} key 页面data中的键名 (支持路径如 'stats.coins')
 * @param {Number} target 目标数字
 * @param {Number} duration 动画时长(ms)
 */
function animateNumber(page, key, target, duration = 800) {
    // 获取当前值，支持嵌套路径
    const keys = key.split('.');
    let start = page.data;
    for (const k of keys) {
        start = start[k];
    }
    start = Number(start) || 0;
    target = Number(target) || 0;

    if (start === target) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
        const timePassed = Date.now() - startTime;
        if (timePassed >= duration) {
            clearInterval(timer);
            page.setData({ [key]: target });
            return;
        }

        const progress = timePassed / duration;
        // easeOutQuad 缓动函数
        const easeProgress = progress * (2 - progress);
        const current = Math.floor(start + (target - start) * easeProgress);
        page.setData({ [key]: current });
    }, 16);
}

module.exports = {
    animateNumber
};
