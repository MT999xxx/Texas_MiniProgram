import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface WechatPayConfig {
  appId: string;           // 小程序APPID
  mchId: string;          // 商户号
  apiKey: string;         // API密钥
  apiV3Key: string;       // APIv3密钥
  certPath: string;       // 商户证书路径
  certKeyPath: string;    // 商户私钥路径
  notifyUrl: string;      // 支付回调地址
}

@Injectable()
export class WechatPayConfigService {
  private readonly config: WechatPayConfig;

  constructor() {
    // 从环境变量或配置文件读取配置
    this.config = {
      appId: process.env.WECHAT_APP_ID || 'your_app_id',
      mchId: process.env.WECHAT_MCH_ID || 'your_mch_id',
      apiKey: process.env.WECHAT_API_KEY || 'your_api_key',
      apiV3Key: process.env.WECHAT_API_V3_KEY || 'your_api_v3_key',
      certPath: process.env.WECHAT_CERT_PATH || path.join(process.cwd(), 'certs', 'apiclient_cert.pem'),
      certKeyPath: process.env.WECHAT_CERT_KEY_PATH || path.join(process.cwd(), 'certs', 'apiclient_key.pem'),
      notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat/notify'
    };
  }

  getConfig(): WechatPayConfig {
    return this.config;
  }

  // 验证配置是否完整
  validateConfig(): boolean {
    const { appId, mchId, apiKey, apiV3Key, certPath, certKeyPath } = this.config;

    if (!appId || !mchId || !apiKey || !apiV3Key) {
      console.warn('微信支付配置不完整，请检查环境变量');
      return false;
    }

    // 检查证书文件是否存在
    try {
      if (!fs.existsSync(certPath) || !fs.existsSync(certKeyPath)) {
        console.warn('微信支付证书文件不存在');
        return false;
      }
    } catch (error) {
      console.warn('无法访问微信支付证书文件:', error);
      return false;
    }

    return true;
  }

  // 获取证书内容
  getCertificateContent(): { cert: string; key: string } | null {
    try {
      const cert = fs.readFileSync(this.config.certPath, 'utf8');
      const key = fs.readFileSync(this.config.certKeyPath, 'utf8');
      return { cert, key };
    } catch (error) {
      console.error('读取证书文件失败:', error);
      return null;
    }
  }
}