import { Injectable, Logger } from '@nestjs/common';

export interface NotificationData {
  type: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'RECHARGE_SUCCESS' | 'ORDER_PAID';
  memberId: string;
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // 发送通知
  async sendNotification(notification: NotificationData): Promise<void> {
    try {
      this.logger.log(`发送通知给用户 ${notification.memberId}: ${notification.title}`);

      // 在这里可以集成具体的通知服务
      // 比如小程序模板消息、微信公众号消息、短信、邮件等

      // 模拟通知发送
      await this.sendTemplateMessage(notification);
      await this.saveNotificationRecord(notification);

      this.logger.log(`通知发送成功: ${notification.type}`);
    } catch (error) {
      this.logger.error(`通知发送失败: ${error.message}`, error.stack);
      // 通知失败不应该影响主流程，所以这里只记录错误
    }
  }

  // 发送支付成功通知
  async sendPaymentSuccessNotification(memberId: string, amount: number, points?: number): Promise<void> {
    const notification: NotificationData = {
      type: 'PAYMENT_SUCCESS',
      memberId,
      title: '支付成功',
      message: points
        ? `您的充值已完成，获得${points}积分`
        : `您的支付已完成，金额￥${amount}`,
      data: { amount, points }
    };

    await this.sendNotification(notification);
  }

  // 发送充值成功通知
  async sendRechargeSuccessNotification(memberId: string, packageName: string, points: number, bonusPoints: number): Promise<void> {
    const notification: NotificationData = {
      type: 'RECHARGE_SUCCESS',
      memberId,
      title: '充值成功',
      message: `${packageName}充值完成，获得${points}积分` + (bonusPoints > 0 ? `，额外奖励${bonusPoints}积分` : ''),
      data: { packageName, points, bonusPoints }
    };

    await this.sendNotification(notification);
  }

  // 发送订单支付成功通知
  async sendOrderPaidNotification(memberId: string, orderNumber: string, amount: number): Promise<void> {
    const notification: NotificationData = {
      type: 'ORDER_PAID',
      memberId,
      title: '订单支付成功',
      message: `订单${orderNumber}支付成功，金额￥${amount}`,
      data: { orderNumber, amount }
    };

    await this.sendNotification(notification);
  }

  // 发送支付失败通知
  async sendPaymentFailedNotification(memberId: string, reason: string): Promise<void> {
    const notification: NotificationData = {
      type: 'PAYMENT_FAILED',
      memberId,
      title: '支付失败',
      message: `支付失败：${reason}，如有疑问请联系客服`,
      data: { reason }
    };

    await this.sendNotification(notification);
  }

  // 发送模板消息（小程序）
  private async sendTemplateMessage(notification: NotificationData): Promise<void> {
    // 这里应该调用微信小程序的模板消息API
    // 需要配置模板ID、用户的formId或prepay_id等

    this.logger.log(`模拟发送模板消息: ${notification.title} -> 用户${notification.memberId}`);

    // 实际实现示例：
    // const accessToken = await this.getAccessToken();
    // const templateData = this.formatTemplateData(notification);
    //
    // await this.httpService.post(`https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=${accessToken}`, {
    //   touser: notification.memberId,
    //   template_id: this.getTemplateId(notification.type),
    //   data: templateData,
    // }).toPromise();
  }

  // 保存通知记录
  private async saveNotificationRecord(notification: NotificationData): Promise<void> {
    // 这里可以将通知记录保存到数据库，便于后续查询和统计
    this.logger.log(`保存通知记录: ${notification.type} -> ${notification.memberId}`);

    // 实际实现可以创建一个NotificationEntity来存储通知记录
  }

  // 获取微信访问令牌
  private async getAccessToken(): Promise<string> {
    // 实现获取微信访问令牌的逻辑
    // 可以从缓存中获取，如果过期则重新获取
    return 'mock_access_token';
  }

  // 根据通知类型获取模板ID
  private getTemplateId(type: string): string {
    const templateMap = {
      'PAYMENT_SUCCESS': 'template_payment_success',
      'PAYMENT_FAILED': 'template_payment_failed',
      'RECHARGE_SUCCESS': 'template_recharge_success',
      'ORDER_PAID': 'template_order_paid',
    };
    return templateMap[type] || 'template_default';
  }

  // 格式化模板数据
  private formatTemplateData(notification: NotificationData): any {
    const baseData = {
      first: { value: notification.title },
      remark: { value: notification.message },
    };

    // 根据不同类型添加特定数据
    switch (notification.type) {
      case 'PAYMENT_SUCCESS':
      case 'RECHARGE_SUCCESS':
        return {
          ...baseData,
          keyword1: { value: notification.data?.amount ? `￥${notification.data.amount}` : '' },
          keyword2: { value: notification.data?.points ? `${notification.data.points}积分` : '' },
          keyword3: { value: new Date().toLocaleString() },
        };
      case 'ORDER_PAID':
        return {
          ...baseData,
          keyword1: { value: notification.data?.orderNumber || '' },
          keyword2: { value: `￥${notification.data?.amount || 0}` },
          keyword3: { value: new Date().toLocaleString() },
        };
      default:
        return baseData;
    }
  }
}