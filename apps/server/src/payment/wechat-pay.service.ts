import { Injectable, Logger } from '@nestjs/common';
import { WechatPay } from 'wechatpay-node-v3';
import { WechatPayConfigService } from './wechat-pay.config';
import { randomBytes } from 'crypto';

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
  private wechatPay: WechatPay | null = null;
  private readonly configService: WechatPayConfigService;

  constructor(configService: WechatPayConfigService) {
    this.configService = configService;
    this.initializeWechatPay();
  }

  // 初始化微信支付
  private initializeWechatPay(): void {
    try {
      if (!this.configService.validateConfig()) {
        this.logger.warn('微信支付配置无效，跳过初始化');
        return;
      }

      const config = this.configService.getConfig();
      const certificates = this.configService.getCertificateContent();

      if (!certificates) {
        this.logger.warn('无法读取微信支付证书，跳过初始化');
        return;
      }

      this.wechatPay = new WechatPay({
        appid: config.appId,
        mchid: config.mchId,
        publicKey: certificates.cert,
        privateKey: certificates.key,
      });

      this.logger.log('微信支付SDK初始化成功');
    } catch (error) {
      this.logger.error('微信支付SDK初始化失败:', error);
    }
  }

  // 检查微信支付是否可用
  isAvailable(): boolean {
    return this.wechatPay !== null && this.configService.validateConfig();
  }

  // 创建小程序支付订单
  async createJsapiOrder(request: WechatPayOrderRequest): Promise<WechatPayOrderResponse | null> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用，无法创建订单');
      return null;
    }

    try {
      const config = this.configService.getConfig();
      const expireTime = new Date();
      expireTime.setMinutes(expireTime.getMinutes() + (request.expireMinutes || 30));

      // 调用微信支付统一下单API
      const orderData = {
        appid: config.appId,
        mchid: config.mchId,
        description: request.description,
        out_trade_no: request.outTradeNo,
        time_expire: expireTime.toISOString().replace(/\.\d{3}Z$/, '+08:00'),
        notify_url: request.notifyUrl || config.notifyUrl,
        amount: {
          total: request.amount,
          currency: 'CNY',
        },
        payer: {
          openid: request.openid,
        },
      };

      const result = await this.wechatPay!.transactions_jsapi(orderData);

      if (result.status === 200 && result.data?.prepay_id) {
        // 生成小程序支付参数
        const timeStamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = this.generateNonceStr();
        const package_ = `prepay_id=${result.data.prepay_id}`;

        // 生成支付签名
        const paySign = this.generatePaySign({
          appId: config.appId,
          timeStamp,
          nonceStr,
          package: package_,
        });

        return {
          prepayId: result.data.prepay_id,
          timeStamp,
          nonceStr,
          package: package_,
          paySign,
          signType: 'RSA',
        };
      }

      this.logger.error('微信支付创建订单失败:', result);
      return null;
    } catch (error) {
      this.logger.error('创建微信支付订单异常:', error);
      return null;
    }
  }

  // 查询订单支付状态
  async queryOrder(outTradeNo: string): Promise<any> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用，无法查询订单');
      return null;
    }

    try {
      const config = this.configService.getConfig();
      const result = await this.wechatPay!.query({
        out_trade_no: outTradeNo,
        mchid: config.mchId,
      });

      return result.data;
    } catch (error) {
      this.logger.error('查询微信支付订单异常:', error);
      return null;
    }
  }

  // 关闭订单
  async closeOrder(outTradeNo: string): Promise<boolean> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用，无法关闭订单');
      return false;
    }

    try {
      const config = this.configService.getConfig();
      const result = await this.wechatPay!.close({
        out_trade_no: outTradeNo,
        mchid: config.mchId,
      });

      return result.status === 204;
    } catch (error) {
      this.logger.error('关闭微信支付订单异常:', error);
      return false;
    }
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
      this.logger.warn('微信支付不可用，无法申请退款');
      return null;
    }

    try {
      const result = await this.wechatPay!.refund({
        out_trade_no: params.outTradeNo,
        out_refund_no: params.outRefundNo,
        reason: params.reason || '用户申请退款',
        amount: {
          refund: params.refundAmount,
          total: params.totalAmount,
          currency: 'CNY',
        },
      });

      return result.data;
    } catch (error) {
      this.logger.error('申请微信支付退款异常:', error);
      return null;
    }
  }

  // 验证支付回调签名
  verifyCallback(signature: string, timestamp: string, nonce: string, body: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return this.wechatPay!.verifySignature(signature, timestamp, nonce, body);
    } catch (error) {
      this.logger.error('验证微信支付回调签名异常:', error);
      return false;
    }
  }

  // 解密回调数据
  decryptCallback(encryptedData: string): any {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const config = this.configService.getConfig();
      return this.wechatPay!.decipher_gcm(encryptedData, '', '', config.apiV3Key);
    } catch (error) {
      this.logger.error('解密微信支付回调数据异常:', error);
      return null;
    }
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

    // 使用私钥签名
    try {
      const certificates = this.configService.getCertificateContent();
      if (!certificates) {
        throw new Error('无法获取证书');
      }

      // 这里应该使用私钥签名，具体实现取决于微信支付SDK
      // 简化处理，实际项目中需要正确的RSA签名
      return this.wechatPay!.buildAuthorization('POST', '/v3/pay/transactions/jsapi', signString);
    } catch (error) {
      this.logger.error('生成支付签名失败:', error);
      return '';
    }
  }
}