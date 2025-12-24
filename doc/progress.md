# 项目进展记录 (Progress)

[2025-12-24 11:35]
[Status]: Done (Implementation) / Waiting for Verification
[Changes]:
1. **全面后台集成 (Full Admin Integration)**:
   - **会员管理 (Members)**: 启用了 `memberApi`，支持积分调整逻辑，并修复了 UI context 警告。
   - **桌位管理 (Tables)**: 移除了模拟数据，启用了 `tableApi`（支持增删改查及状态切换），对齐了后端 PUT 接口。
   - **预约管理 (Reservations)**: 移除了模拟数据，启用了 `reservationApi`。新建预约弹窗现在会动态加载真实的会员和桌位列表。支持批量确认、批量取消及导出功能。
   - **订单管理 (Orders)**: 移除了模拟数据，启用了 `orderApi`。接入了 `getStats` 统计接口，实时显示订单概况。支持订单完成和退款操作。
2. **UI 稳定性与一致性**:
   - 所有管理页面均已采用 Ant Design 的 `App.useApp()` 钩子，统一了 `message` 和 `modal` 的调用方式，彻底解决了 "Static function can not consume context" 的警告。
   - 修正了 `api/tables.ts` 中的接口请求方法（PATCH -> PUT）以对齐后端控制器。
3. **缺陷修复 (Bug Fixes)**:
   - **toFixed 崩溃修复**: 修复了 `Menu`、`Orders`、`Members` 页面中单价和金额调用 `toFixed(2)` 时因后端返回数据（Decimal 类型）为字符串而导致的崩溃问题。现在均已通过 `Number()` 显式转换。
   - **Dashboard 统计图修复**: 修正了统计图表达式解析错误（ExpressionError），将标签定义从模板字符串改为直接引用字段。
   - **Ant Design 弃用警告处理**: 统一将 `Card` 的 `bordered` 替换为 `variant="borderless"`，`Modal` 的 `destroyOnClose` 替换为 `destroyOnHidden`，以及 `Dropdown` 的 `dropdownRender` 替换为 `popupRender`。
   - **后端 API 缺失修复**: 补齐了后端 `MenuController` 中缺失的编辑、删除及状态切换接口（`PATCH /menu/items/:id`，`DELETE /menu/items/:id`），解决了前端 404 报错。
   - **字段映射一致性**: 将后端 DTO 中的 `desc` 统一修改为 `description`，与前端和数据库实体对齐。

4. **小程序同步与集成 (Mini-Program Integration)**:
   - **API 路径对齐**: 修复了小程序中大量过时或错误的 API 路径（如 `/menu/goods` -> `/menu/items`，`/reservation/create` -> `/reservations` 等），确保数据能从真实后端加载。
   - **身份验证增强**: 优化了后端 `JwtStrategy` 和 `/auth/profile` 接口，使其返回完整的会员信息（包含积分、等级），解决了小程序个人中心数据显示不全的问题。
   - **资源路径修复**: 修正了小程序中引用本地图片时的中文路径错误，改为对应的英文文件名（如 `zhuomian2.png`），解决了控制台 500 报错。
   - **UI 数据对齐**: 修正了菜单页面的字段映射（`desc` -> `description`），确保下单流程中的数据结构与后端 DTO 一致。

[Next Step]: 交付用户在开发者工具中刷新小程序进行验证。建议检查本地后端服务的 URL/ngrok 隧道是否正常开启。
