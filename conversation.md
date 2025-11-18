# Texas Mini Program 开发对话记录

> 以下为 2025-11-17 至 2025-11-18 期间 Codex（助手）与用户围绕 “德州扑克主题酒吧服务型小程序” 项目的协作摘要。内容来自 CLI 终端与 IDE 互动，按时间顺序梳理。

## 一、项目规划阶段
1. **用户**：描述要开发的德州扑克主题酒吧服务型小程序及管理后台，并提供图片参考。
2. **助手**：在 `docs/dev-plan.md` 输出完整开发计划，覆盖业务目标、功能划分、技术方案、迭代节奏、部署与运维等。

## 二、后端初始搭建
1. **用户**：要求按计划开始编写代码。
2. **助手**：
   - 创建 monorepo 结构、`pnpm-workspace.yaml`。
   - 在 `apps/server` 使用 NestJS 搭建后端雏形（预约模块、内存实现）。
   - 说明如何启动与测试。

## 三、后端扩展（表位/库存/会员）
1. **用户**：需要表/库存/会员模块。
2. **助手**：补充桌位、菜单、会员模块的 DTO/Service/Controller，新增依赖并集成到 `AppModule`。

## 四、持久化与联动
1. **用户**：要求 MySQL + Redis 持久化，并连通预约、订单、积分。
2. **助手**：
   - 引入 TypeORM、ioredis，改造实体为数据库模型。
   - 新增 Orders、Loyalty 模块，实现库存扣减、积分发放、Redis 缓存状态。
   - 提供 `.env` 配置示例。

## 五、积分与库存策略
1. **用户**：补充库存回补。
2. **助手**：在订单状态变为 CANCELLED 时回补库存，并更新相关代码。

## 六、Swagger 与测试
1. **用户**：要求集成 Swagger。
2. **助手**：在 `main.ts` 启动 Swagger，新增依赖。
3. **用户**：要求 DTO/实体添加 Swagger 注解。
4. **助手**：为主要 DTO/实体/Controller 添加 `@ApiProperty`、`@ApiTags` 等。
5. **用户**：需 Swagger 示例、错误码说明及 Jest + Supertest 测试。
6. **助手**：
   - 补充 ApiResponse 注解。
   - 引入 Jest、ts-jest、Supertest，编写 `test/app.e2e.spec.ts` 覆盖预约/订单流程。

## 七、数据层巩固
1. **助手**：
   - 引入 `dotenv`、`data-source.ts`，关闭 `synchronize`，提供 `.env` 模板。
   - 添加迁移脚本命令。

## 八、前端初始化
1. **用户**：要求按计划启动小程序与管理后台开发。
2. **助手**：
   - 创建 `apps/admin`（React + Vite + AntD），实现桌位列表、预约弹窗。
   - 创建 `apps/mp`（微信小程序）首页与预约页，调用后端 `/tables` `/reservations`。

## 九、运行调试问题
1. **用户**：`npm dev:server` 无法运行。
2. **助手**：解释需 `npm run dev:server` 或 `pnpm dev:server`。
3. **用户**：`ts-node-dev` 报 ESM 错误。
4. **助手**：调整 `tsconfig` 为 CJS，移除 `package.json` 的 `"type": "module"`.
5. **用户**：管理后台代理报错。
6. **助手**：说明需启动后端或使用 `VITE_API_BASE`。
7. **用户**：后端连不上 MySQL/Redis。
8. **助手**：加入 `mysql2` 依赖、指导安装 MySQL/Redis（Docker 方案）。
9. **用户**：安装 Docker 后拉起 MySQL/Redis，但访问接口仍报错。
10. **助手**：解释需运行迁移，提供 `migration:run` 步骤；修复保留字 `desc`。
11. **用户**：迁移成功后 `/tables` 无数据。
12. **助手**：说明因尚未创建桌位记录，示例了 `POST /tables` 用法，可在 Swagger 或 curl 中添加。

## 十、后续提醒
- 运行后端：`pnpm dev:server`（需已启动 MySQL、Redis）。
- 运行后台：`pnpm dev:admin`，确保 Vite 代理 `rewrite` 生效。
- 运行测试：`pnpm --filter server test`（SQLite + Redis mock）。
- 迁移命令：`pnpm --filter server migration:run`.

> 若需更详细的原始对话记录，可在 CLI 历史或编辑器终端查阅。此文档仅保存关键对话主题与解决方案。***
