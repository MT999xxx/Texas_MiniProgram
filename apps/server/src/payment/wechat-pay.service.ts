import { Injectable, Logger } from '@nestjs/common';
import { WechatPayConfigService } from './wechat-pay.config';
import { createSign, randomBytes } from 'crypto';
import axios from 'axios';

export interface WechatPayOrderRequest {
  outTradeNo: string;      // 商户订单号
  description: string;     // 商品描述
  amount: number;          // 支付金额（分）
  openid: string;          // 用户openid
  expireMinutes?: number;  // 过期时间（分钟），默认30分钟
  notifyUrl?: string;      // 回调地址
}

export interface WechatPayOrderResponse {
  prepayId: string;        // 预支付ID
  paySign: string;         // 支付签名
  timeStamp: string;       // 时间戳
  nonceStr: string;        // 随机字符串
  package: string;         // 订单详情扩展字符串
  signType: string;        // 签名方式
}

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly configService: WechatPayConfigService;

  constructor(configService: WechatPayConfigService) {
    this.configService = configService;
  }

  // 检查微信支付是否可用
  isAvailable(): boolean {
    return this.configService.validateConfig();
  }

  // 创建小程序支付订单（简化版）
  async createJsapiOrder(request: WechatPayOrderRequest): Promise<WechatPayOrderResponse | null> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付配置不完整，返回测试数据');
      // 返回测试数据，方便开发调试
      return this.createMockPaymentResponse(request);
    }

    try {
      const config = this.configService.getConfig();

      // 正式环境：调用微信支付API
      // TODO: 实现真实的微信支付API调用
      this.logger.log('微信支付功能需要完整配置后才能使用，当前返回测试数据');
      return this.createMockPaymentResponse(request);

    } catch (error) {
      this.logger.error('创建微信支付订单异常:', error);
      return null;
    }
  }

  // 创建模拟支付响应（用于测试）
  private createMockPaymentResponse(request: WechatPayOrderRequest): WechatPayOrderResponse {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const prepayId = `mock_prepay_id_${Date.now()}`;
    const package_ = `prepay_id=${prepayId}`;

    return {
      prepayId,
      timeStamp,
      nonceStr,
      package: package_,
      paySign: 'mock_pay_sign_for_testing',
      signType: 'RSA',
    };
  }

  // 查询订单支付状态
  async queryOrder(outTradeNo: string): Promise<any> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用，返回模拟查询结果');
      return { trade_state: 'SUCCESS', transaction_id: `mock_${outTradeNo}` };
    }

    // TODO: 实现真实的订单查询
    this.logger.log(`查询订单: ${outTradeNo}`);
    return null;
  }

  // 关闭订单
  async closeOrder(outTradeNo: string): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用');
      return false;
    }

    // TODO: 实现真实的订单关闭
    this.logger.log(`关闭订单: ${outTradeNo}`);
    return true;
  }

  // 申请退款
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    refundAmount: number;
    totalAmount: number;
    reason?: string;
  }): Promise<any> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用');
      return null;
    }

    // TODO: 实现真实的退款功能
    this.logger.log(`申请退款: ${params.outTradeNo}, 金额: ${params.refundAmount}`);
    return { refund_id: `mock_refund_${Date.now()}`, status: 'SUCCESS' };
  }

  // 验证支付回调签名  
  verifyCallback(signature: string, timestamp: string, nonce: string, body: string): boolean {
    if (!this.isAvailable()) {
      // 测试环境跳过签名验证
      this.logger.warn('测试环境：跳过微信支付回调签名验证');
      return true;
    }

    // TODO: 实现真实的签名验证
    try {
      // 这里需要使用微信支付平台证书公钥验证
      this.logger.log('签名验证逻辑待实现');
      return true;
    } catch (error) {
      this.logger.error('验证微信支付回调签名异常:', error);
      return false;
    }
  }

  // 解密回调数据
  decryptCallback(encryptedData: any): any {
    if (!this.isAvailable()) {
      // 测试环境返回模拟数据
      return {
        out_trade_no: encryptedData.out_trade_no || 'mock_trade_no',
        trade_state: 'SUCCESS',
        transaction_id: 'mock_transaction_id',
        amount: { total: 100 },
      };
    }

    // TODO: 实现真实的数据解密
    return encryptedData;
  }

  // 生成随机字符串
  private generateNonceStr(): string {
    return randomBytes(16).toString('hex');
  }

  // 生成小程序支付签名
  private generatePaySign(params: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
  }): string {
    // 构建签名字符串
    const signString = [
      params.appId,
      params.timeStamp,
      params.nonceStr,
      params.package,
    ].join('\n') + '\n';

    try {
      const certificates = this.configService.getCertificateContent();
      if (!certificates) {
        throw new Error('无法获取证书');
      }

      // 使用RSA-SHA256签名
      const sign = createSign('RSA-SHA256');
      sign.update(signString);
      const signature = sign.sign(certificates.key, 'base64');

      return signature;
    } catch (error) {
      this.logger.error('生成支付签名失败:', error);
      return 'mock_signature';
    }
  }
}