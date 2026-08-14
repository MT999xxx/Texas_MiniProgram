# Set baR 订单打印代理

该程序运行在门店 Windows 电脑上，轮询后端已支付订单的打印任务，并通过
`HPRT D35PBT` 的 Windows 打印队列发送 ESC/POS 小票。

## 配置

1. 复制 `.env.example` 为 `.env`。
2. `PRINT_AGENT_TOKEN` 必须与服务器的同名环境变量一致。
3. 在 Windows 的“打印机和扫描仪”中确认打印机名称与 `PRINTER_NAME` 一致。

## 验证

```powershell
pnpm --filter print-agent test-print
```

确认测试小票正常后，启动代理：

```powershell
pnpm --filter print-agent start
```

注册为当前 Windows 用户登录后自动启动：

```powershell
powershell -ExecutionPolicy Bypass -File apps/print-agent/windows/install-autostart.ps1
```
