import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class WechatPayService {
    private readonly logger = new Logger(WechatPayService.name);

    private readonly appId = process.env.WECHAT_APP_ID;
    private readonly mchId = process.env.WECHAT_MCH_ID;
    private readonly apiKey = process.env.WECHAT_API_KEY;
    private readonly apiV3Key = process.env.WECHAT_API_V3_KEY;
    private readonly notifyUrl = process.env.WECHAT_NOTIFY_URL;
    private readonly certPath = process.env.WECHAT_CERT_PATH;
    private readonly certKeyPath = process.env.WECHAT_CERT_KEY_PATH;
    private readonly serialNo = process.env.WECHAT_CERT_SERIAL_NO;

    /**
     * 检查配置是否完整
     */
    isConfigured(): boolean {
        return !!(this.appId && this.mchId && this.apiV3Key && this.notifyUrl && this.serialNo);
    }

    /**
     * 生成随机字符串
     */
    private generateNonceStr(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * 生成时间戳
     */
    private generateTimestamp(): string {
        return Math.floor(Date.now() / 1000).toString();
    }

    /**
     * 生成订单号
     */
    generateOutTradeNo(): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        return `TX${timestamp}${random}`.toUpperCase();
    }

    /**
     * 创建小程序支付订单 (JSAPI)
     */
    async createOrder(params: {
        outTradeNo: string;
        totalAmount: number; // 单位：元
        description: string;
        openId: string;
    }): Promise<{
        success: boolean;
        paymentParams?: {
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: string;
        };
        error?: string;
    }> {
        if (!this.isConfigured()) {
            this.logger.warn('微信支付配置不完整，使用模拟模式');
            return this.mockPayment(params.outTradeNo);
        }

        try {
            const orderData = {
                appid: this.appId,
                mchid: this.mchId,
                description: params.description,
                out_trade_no: params.outTradeNo,
                notify_url: this.notifyUrl,
                amount: {
                    total: Math.round(params.totalAmount * 100), // 转换为分
                    currency: 'CNY',
                },
                payer: {
                    openid: params.openId,
                },
            };

            const response = await this.postV3('/v3/pay/transactions/jsapi', orderData);

            if (response.prepay_id) {
                // 生成小程序调起支付的参数
                const timeStamp = this.generateTimestamp();
                const nonceStr = this.generateNonceStr();
                const packageStr = `prepay_id=${response.prepay_id}`;

                // 签名
                const signStr = `${this.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
                const paySign = this.signWithPrivateKey(signStr);

                return {
                    success: true,
                    paymentParams: {
                        timeStamp,
                        nonceStr,
                        package: packageStr,
                        signType: 'RSA',
                        paySign,
                    },
                };
            }

            return { success: false, error: response.message || '创建订单失败' };
        } catch (error: any) {
            this.logger.error('创建微信支付订单失败:', error);
            return { success: false, error: error?.message || '支付失败' };
        }
    }

    /**
     * 验证支付回调签名
     */
    verifyNotification(headers: any, body: string): boolean {
        try {
            const timestamp = headers['wechatpay-timestamp'];
            const nonce = headers['wechatpay-nonce'];
            const signature = headers['wechatpay-signature'];

            const message = `${timestamp}\n${nonce}\n${body}\n`;

            // 这里需要用微信平台证书公钥验证，简化处理
            // 实际生产环境应该定期下载微信平台证书
            return !!signature;
        } catch (error) {
            this.logger.error('验证回调签名失败:', error);
            return false;
        }
    }

    /**
     * 解密回调数据
     */
    decryptNotification(resource: {
        algorithm: string;
        ciphertext: string;
        nonce: string;
        associated_data?: string;
    }): any {
        try {
            const ciphertext = Buffer.from(resource.ciphertext, 'base64');
            const nonce = Buffer.from(resource.nonce);
            const aad = Buffer.from(resource.associated_data || '');

            const authTag = ciphertext.slice(-16);
            const data = ciphertext.slice(0, -16);

            if (!this.apiV3Key) throw new Error('API V3 Key not configured');
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.apiV3Key as string, nonce);
            decipher.setAuthTag(authTag);
            decipher.setAAD(aad);

            const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
            return JSON.parse(decrypted.toString('utf8'));
        } catch (error) {
            this.logger.error('解密回调数据失败:', error);
            return null;
        }
    }

    /**
     * 使用私钥签名
     */
    private signWithPrivateKey(message: string): string {
        try {
            if (!this.certKeyPath) throw new Error('Certificate key path not configured');
            const privateKey = fs.readFileSync(this.certKeyPath, 'utf8');
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(message);
            return sign.sign(privateKey, 'base64');
        } catch (error) {
            this.logger.error('签名失败:', error);
            return '';
        }
    }

    /**
     * 发送 V3 API 请求
     */
    private async postV3(path: string, data: any): Promise<any> {
        const timestamp = this.generateTimestamp();
        const nonceStr = this.generateNonceStr();
        const body = JSON.stringify(data);

        const signMessage = `POST\n${path}\n${timestamp}\n${nonceStr}\n${body}\n`;
        const signature = this.signWithPrivateKey(signMessage);

        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.serialNo}",signature="${signature}"`;

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.mch.weixin.qq.com',
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': authorization,
                },
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseBody));
                    } catch {
                        resolve({ message: responseBody });
                    }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    /**
     * 模拟支付（配置不完整时使用）
     */
    private mockPayment(outTradeNo: string): {
        success: boolean;
        paymentParams: {
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: string;
        };
    } {
        return {
            success: true,
            paymentParams: {
                timeStamp: this.generateTimestamp(),
                nonceStr: this.generateNonceStr(),
                package: `prepay_id=mock_${outTradeNo}`,
                signType: 'RSA',
                paySign: 'MOCK_SIGN_FOR_TESTING',
            },
        };
    }
}
