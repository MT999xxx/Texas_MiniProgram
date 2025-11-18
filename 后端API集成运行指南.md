# 后端API集成运行指南

## 快速开始

### 1. 环境准备

确保以下服务正在运行：

```bash
# MySQL (端口 3306)
# Redis (端口 6379)
```

如果使用Docker，可以快速启动：

```bash
# 启动 MySQL
docker run --name texas-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=texas_poker -p 3306:3306 -d mysql:8

# 启动 Redis
docker run --name texas-redis -p 6379:6379 -d redis:alpine
```

### 2. 配置环境变量

在 `apps/server` 目录下创建 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=texas_poker

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务端口
PORT=3000
```

### 3. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 4. 运行数据库迁移

```bash
# 进入server目录
cd apps/server

# 运行迁移
pnpm migration:run
```

### 5. 初始化种子数据

```bash
# 在 apps/server 目录
pnpm seed
```

这将创建：
- ✅ 5个会员等级（V1-V5）
- ✅ 8个桌位（主赛桌、副赛桌、餐饮区）
- ✅ 6个菜单分类
- ✅ 13个菜品
- ✅ 3个测试会员

### 6. 启动后端服务

```bash
# 在 apps/server 目录
pnpm dev
```

服务启动后：
- API服务: http://localhost:3000
- Swagger文档: http://localhost:3000/docs

## API接口测试

### 测试菜单接口

```bash
# 获取菜单分类
curl http://localhost:3000/menu/categories

# 获取菜品列表
curl http://localhost:3000/menu/items

# 获取特定分类的菜品
curl http://localhost:3000/menu/items?categoryId=<分类ID>
```

### 测试桌位接口

```bash
# 获取所有桌位
curl http://localhost:3000/tables

# 获取可用桌位
curl http://localhost:3000/tables?status=AVAILABLE
```

### 测试会员接口

```bash
# 获取会员等级列表
curl http://localhost:3000/membership/levels

# 获取当前会员信息（返回默认测试用户）
curl http://localhost:3000/membership/members/current

# 获取所有会员
curl http://localhost:3000/membership/members
```

## 小程序配置

### 更新API基础URL

修改 `apps/mp/utils/request.js`:

```javascript
const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    // 修改为实际的后端地址
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');
    // ...
  });
};
```

### 配置开发者工具

在微信开发者工具中：

1. 点击右上角 "详情"
2. 找到 "本地设置"
3. 勾选 "不校验合法域名、web-view(业务域名)、TLS版本以及HTTPS证书"

### 测试小程序

1. 启动后端服务（确保在 3000 端口）
2. 打开微信开发者工具
3. 导入项目，选择 `apps/mp` 目录
4. 编译运行

## 常见问题

### Q1: 数据库连接失败

**解决方案**:
- 检查MySQL是否正在运行
- 检查 `.env` 文件中的数据库配置
- 确认数据库 `texas_poker` 已创建

```bash
# 手动创建数据库
mysql -uroot -p
CREATE DATABASE texas_poker;
```

### Q2: Redis连接失败

**解决方案**:
- 检查Redis是否正在运行
- 检查Redis端口是否为6379
- 如果不需要Redis，可以暂时注释掉Redis相关代码

### Q3: 迁移运行失败

**解决方案**:
```bash
# 重置数据库
pnpm migration:revert

# 重新运行迁移
pnpm migration:run
```

### Q4: 小程序无法请求接口

**解决方案**:
1. 检查后端服务是否启动
2. 检查开发者工具是否勾选"不校验合法域名"
3. 检查 `request.js` 中的 `apiBase` 配置
4. 查看控制台错误信息

### Q5: 种子数据初始化失败

**解决方案**:
```bash
# 确保迁移已运行
pnpm migration:run

# 重新运行种子脚本
pnpm seed
```

## 开发流程

### 1. 修改数据模型

```bash
# 1. 修改entity文件
# 2. 生成迁移文件
pnpm migration:generate src/migrations/DescriptionOfChange

# 3. 运行迁移
pnpm migration:run

# 4. 更新种子数据（如需要）
pnpm seed
```

### 2. 添加新API

1. 创建DTO（Data Transfer Object）
2. 在Service中添加业务逻辑
3. 在Controller中添加路由
4. 添加Swagger注解
5. 在小程序中调用新API

### 3. 调试技巧

**后端调试**:
- 使用Swagger UI测试API: http://localhost:3000/docs
- 查看控制台日志
- 使用Postman或curl测试

**小程序调试**:
- 使用微信开发者工具Console
- 查看Network面板
- 使用`console.log`输出调试信息

## 下一步

- [ ] 集成微信登录（wx.login）
- [ ] 集成微信支付（wx.requestPayment）
- [ ] 添加图片上传功能
- [ ] 完善错误处理和日志
- [ ] 添加单元测试和E2E测试
- [ ] 性能优化（缓存、分页等）

## 有用的命令

```bash
# 查看所有npm scripts
pnpm run

# 重启后端服务（自动重载）
pnpm dev

# 运行测试
pnpm test

# 查看数据库内容
mysql -uroot -p texas_poker
SELECT * FROM tables;
SELECT * FROM menu_categories;
SELECT * FROM menu_items;
SELECT * FROM members;

# 清空并重新初始化数据
pnpm migration:revert
pnpm migration:run
pnpm seed
```

## 技术支持

如遇到问题，请检查：
1. [conversation.md](../../conversation.md) - 之前的开发记录
2. [小程序功能完善总结.md](../../小程序功能完善总结.md) - 功能说明
3. Swagger文档 - http://localhost:3000/docs

---

*最后更新: 2025-11-18*