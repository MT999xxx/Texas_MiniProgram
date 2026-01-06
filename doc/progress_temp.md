## [Date/Time]: 2026-01-07 01:10

### [Status]: Done

### [Changes]:
1. **修复支付 JS 错误**：由于 `require` 导入方式不当导致的 `c is not a function` 报错已修复。在 `payment.js` 中将 `const { request } = require('./request')` 修改为正确的全模块导入 `const request = require('./request')`。
2. **修复价格显示异常**：处理了点餐页面的浮点数精度问题。通过在 `updateCart` 中增加 `toFixed(2)` 处理，确保购物车总额显示为正常的小数位（如 1.40）。

### [Next Step]:
1. **用户操作**：在开发者工具中刷新代码，测试点餐并支付，确认支付弹窗能正常调起。
2. **用户操作**：确认购物车下方金额显示是否已恢复正常。
