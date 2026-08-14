'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertReceiptIsPrintable, formatReceipt } = require('./receipt');

const AGENT_VERSION = '20260810-v9';
const LABEL_SIZE = '40x30mm';

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.resolve(__dirname, '..', '.env'));

const config = {
  apiBaseUrl: String(process.env.API_BASE_URL || 'https://dezhoubar.xyz/api').replace(/\/$/, ''),
  token: String(process.env.PRINT_AGENT_TOKEN || ''),
  printerName: String(process.env.PRINTER_NAME || 'HPRT D41(1)'),
  pollIntervalMs: Math.max(1000, Number(process.env.POLL_INTERVAL_MS || 3000)),
};

const scriptPath = path.resolve(__dirname, '..', 'windows', 'print-raw.ps1');

function log(message) {
  console.log(`[${new Date().toLocaleString('zh-CN', { hour12: false })}] ${message}`);
}

function printText(text) {
  const tempPath = path.join(os.tmpdir(), `setbar-receipt-${Date.now()}.txt`);
  fs.writeFileSync(tempPath, text, 'utf8');
  try {
    const result = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        '-PrinterName',
        config.printerName,
        '-TextFile',
        tempPath,
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || '打印命令执行失败').trim());
    }
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function apiRequest(relativePath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.apiBaseUrl}${relativePath}`);
    const body = options.body == null ? null : String(options.body);
    const headers = {
      'Content-Type': 'application/json',
      'x-print-agent-token': config.token,
      ...(options.headers || {}),
    };
    if (body != null) headers['Content-Length'] = Buffer.byteLength(body);

    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(
      url,
      {
        method: options.method || 'GET',
        headers,
        timeout: 15000,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          const status = response.statusCode || 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`接口 ${status}: ${responseBody || response.statusMessage || '请求失败'}`));
            return;
          }
          if (status === 204 || !responseBody) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(responseBody));
          } catch (error) {
            reject(new Error(`接口返回数据格式错误：${error.message}`));
          }
        });
      },
    );

    request.on('timeout', () => request.destroy(new Error('接口请求超时')));
    request.on('error', reject);
    if (body != null) request.write(body);
    request.end();
  });
}

async function processNextJob() {
  const job = await apiRequest('/print-jobs/next');
  if (!job) return false;

  try {
    const receipt = formatReceipt(job.payload);
    assertReceiptIsPrintable(receipt);
    printText(receipt);
    await apiRequest(`/print-jobs/${job.id}/complete`, { method: 'POST' });
    log(`打印成功：${job.payload.orderNumber} / ${job.payload.tableName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`打印失败：${job.payload?.orderNumber || job.id} / ${message}`);
    await apiRequest(`/print-jobs/${job.id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ error: message }),
    }).catch((reportError) => log(`上报打印失败状态失败：${reportError.message}`));
  }
  return true;
}

async function run() {
  if (!config.token) {
    throw new Error('缺少 PRINT_AGENT_TOKEN，请先配置代理根目录的 .env');
  }
  log(`打印代理已启动，打印机：${config.printerName}，标签：${LABEL_SIZE}，版本：${AGENT_VERSION}`);
  while (true) {
    try {
      const handled = await processNextJob();
      if (handled) continue;
    } catch (error) {
      log(`轮询失败：${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }
}

if (process.argv.includes('--test')) {
  log(`打印代理测试，打印机：${config.printerName}，标签：${LABEL_SIZE}，版本：${AGENT_VERSION}`);
  const receipt = formatReceipt({
    tableName: '打印测试桌',
    paymentMethod: 'wechat_pay',
    totalAmount: 116,
    items: [
      { name: '长岛冰茶', quantity: 1 },
      { name: '夏日海洋（无酒精）', quantity: 1 },
    ],
  });
  assertReceiptIsPrintable(receipt);
  log(`测试票内容：\n${receipt}`);
  printText(receipt);
  log('测试小票已发送到打印机');
} else {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
