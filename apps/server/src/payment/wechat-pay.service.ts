import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { WechatPayConfigService } from './wechat-pay.config';
import { createSign, randomBytes, X509Certificate } from 'crypto';
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

  // 创建小程序支付订单（JSAPI v3）
  async createJsapiOrder(request: WechatPayOrderRequest): Promise<WechatPayOrderResponse | null> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付配置不完整，返回测试数据');
      return this.createMockPaymentResponse(request);
    }

    try {
      const config = this.configService.getConfig();
      const certificates = this.configService.getCertificateContent();

      if (!certificates) {
        this.logger.error('无法读取支付证书');
        return this.createMockPaymentResponse(request);
      }

      // 构建请求参数
      const orderData = {
        appid: config.appId,
        mchid: config.mchId,
        description: request.description,
        out_trade_no: request.outTradeNo,
        notify_url: request.notifyUrl || config.notifyUrl,
        amount: {
          total: request.amount, // 金额，单位：分
          currency: 'CNY',
        },
        payer: {
          openid: request.openid,
        },
      };

      // 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const method = 'POST';
      const url = '/v3/pay/transactions/jsapi';
      const body = JSON.stringify(orderData);

      // 构建签名串
      const signMessage = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;

      // RSA-SHA256 签名
      const sign = createSign('RSA-SHA256');
      sign.update(signMessage);
      const signature = sign.sign(certificates.key, 'base64');

      // 构建 Authorization 头
      const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.getCertSerialNo(certificates.cert)}"`;

      // 调用微信支付API
      const response = await axios.post(
        'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi',
        orderData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader,
          },
        }
      );

      this.logger.log(`微信支付订单创建成功: ${response.data.prepay_id}`);

      // 生成小程序调起支付所需参数
      const prepayId = response.data.prepay_id;
      const payTimestamp = Math.floor(Date.now() / 1000).toString();
      const payNonceStr = this.generateNonceStr();
      const packageStr = `prepay_id=${prepayId}`;

      const paySign = this.generatePaySign({
        appId: config.appId,
        timeStamp: payTimestamp,
        nonceStr: payNonceStr,
        package: packageStr,
      });

      return {
        prepayId,
        timeStamp: payTimestamp,
        nonceStr: payNonceStr,
        package: packageStr,
        paySign,
        signType: 'RSA',
      };

    } catch (error: any) {
      const reason = this.formatWechatPayError(error);
      this.logger.error(`创建微信支付订单异常: ${reason}`, error?.response?.data || error?.stack || error);
      throw new BadRequestException(`创建微信支付订单失败：${reason}`);
    }
  }

  // 获取证书序列号
  private getCertSerialNo(certContent: string): string {
    const configuredSerialNo = process.env.WECHAT_CERT_SERIAL_NO?.trim();
    if (configuredSerialNo) {
      return configuredSerialNo.replace(/:/g, '').toUpperCase();
    }

    try {
      const certificate = new X509Certificate(certContent);
      const serialNo = certificate.serialNumber.replace(/:/g, '').toUpperCase();
      if (serialNo) {
        return serialNo;
      }
    } catch (error) {
      this.logger.error('获取证书序列号失败:', error);
    }

    throw new Error('无法读取微信支付商户API证书序列号');
  }

  private formatWechatPayError(error: any): string {
    const responseData = error?.response?.data;
    if (responseData) {
      const code = responseData.code || responseData.error_code;
      const message = responseData.message || responseData.detail?.message || responseData.description;
      if (code && message) {
        return `${code}: ${message}`;
      }
      if (message) {
        return String(message);
      }
      try {
        return JSON.stringify(responseData);
      } catch {
        return String(responseData);
      }
    }

    return error?.message || '未知错误';
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

    try {
      const config = this.configService.getConfig();
      const certificates = this.configService.getCertificateContent();

      if (!certificates) {
        this.logger.error('无法读取支付证书');
        return null;
      }

      // 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const method = 'GET';
      const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${config.mchId}`;

      // 构建签名串
      const signMessage = `${method}\n${url}\n${timestamp}\n${nonceStr}\n\n`;

      // RSA-SHA256 签名
      const sign = createSign('RSA-SHA256');
      sign.update(signMessage);
      const signature = sign.sign(certificates.key, 'base64');

      // 构建 Authorization 头
      const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.getCertSerialNo(certificates.cert)}"`;

      // 调用微信支付API查询订单
      const response = await axios.get(
        `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${config.mchId}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': authHeader,
          },
        }
      );

      this.logger.log(`查询订单成功: ${outTradeNo}, 状态: ${response.data.trade_state}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('查询订单失败:', error?.response?.data || error.message);
      return null;
    }
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

  // 申请退款（微信支付 V3 API）
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    refundAmount: number;
    totalAmount: number;
    reason?: string;
  }): Promise<any> {
    if (!this.isAvailable()) {
      this.logger.warn('微信支付不可用，使用模拟退款');
      return { refund_id: `mock_refund_${Date.now()}`, status: 'SUCCESS' };
    }

    try {
      const config = this.configService.getConfig();
      const certificates = this.configService.getCertificateContent();
      if (!certificates) {
        this.logger.error('无法读取支付证书，退款失败');
        return null;
      }

      const refundData = {
        out_trade_no: params.outTradeNo,
        out_refund_no: params.outRefundNo,
        reason: params.reason || '管理员退款',
        amount: {
          refund: params.refundAmount,   // 退款金额（分）
          total: params.totalAmount,     // 原订单金额（分）
          currency: 'CNY',
        },
      };

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const method = 'POST';
      const url = '/v3/refund/domestic/refunds';
      const body = JSON.stringify(refundData);

      const signMessage = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
      const sign = createSign('RSA-SHA256');
      sign.update(signMessage);
      const signature = sign.sign(certificates.key, 'base64');

      const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.getCertSerialNo(certificates.cert)}"`;

      const response = await axios.post(
        'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds',
        refundData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader,
          },
        },
      );

      this.logger.log(`退款申请成功: ${response.data.refund_id}, 状态: ${response.data.status}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('微信退款异常:', error?.response?.data || error.message);
      throw new Error(`微信退款失败: ${error?.response?.data?.message || error.message}`);
    }
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
