// 支付工具类
class PaymentUtils {
  // 查询支付状态
  static async queryPaymentStatus(paymentId) {
    const { request } = require('./request');

    try {
      const payment = await request({
        url: `/payment/status/${paymentId}`,
        method: 'GET',
      });

      return {
        success: true,
        data: payment,
        status: payment.status,
        isPaid: payment.status === 'SUCCESS',
        isFailed: payment.status === 'FAILED',
        isPending: payment.status === 'PENDING' || payment.status === 'PROCESSING',
      };
    } catch (error) {
      console.error('查询支付状态失败:', error);
      return {
        success: false,
        error: error.message,
        status: 'UNKNOWN',
      };
    }
  }

  // 轮询查询支付状态
  static async pollPaymentStatus(paymentId, options = {}) {
    const {
      maxAttempts = 30,      // 最大查询次数
      interval = 2000,       // 查询间隔（毫秒）
      timeout = 60000,       // 总超时时间（毫秒）
      onProgress = null,     // 进度回调
    } = options;

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const startTime = Date.now();

      const poll = async () => {
        attempts++;

        // 检查是否超时
        if (Date.now() - startTime > timeout) {
          reject(new Error('查询超时'));
          return;
        }

        // 检查是否超过最大尝试次数
        if (attempts > maxAttempts) {
          reject(new Error('查询次数超限'));
          return;
        }

        try {
          const result = await this.queryPaymentStatus(paymentId);

          // 回调进度
          if (onProgress) {
            onProgress({
              attempts,
              maxAttempts,
              elapsed: Date.now() - startTime,
              result,
            });
          }

          // 支付完成（成功或失败）
          if (result.isPaid || result.isFailed) {
            resolve(result);
            return;
          }

          // 继续轮询
          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  }

  // 格式化支付状态文本
  static formatPaymentStatus(status) {
    const statusMap = {
      'PENDING': '待支付',
      'PROCESSING': '支付中',
      'SUCCESS': '支付成功',
      'FAILED': '支付失败',
      'CANCELLED': '已取消',
    };
    return statusMap[status] || status;
  }

  // 处理微信支付结果
  static async handleWechatPayResult(paymentData, paymentId) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: paymentData.timeStamp,
        nonceStr: paymentData.nonceStr,
        package: paymentData.package,
        signType: paymentData.signType,
        paySign: paymentData.paySign,
        success: async (res) => {
          console.log('微信支付成功:', res);

          try {
            // 支付成功后，轮询查询支付状态确认
            const result = await this.pollPaymentStatus(paymentId, {
              maxAttempts: 20,
              interval: 1000,
              onProgress: (progress) => {
                console.log(`查询支付状态进度: ${progress.attempts}/${progress.maxAttempts}`);
              },
            });

            if (result.isPaid) {
              resolve({
                success: true,
                message: '支付成功',
                data: result.data,
              });
            } else {
              resolve({
                success: false,
                message: '支付状态异常',
                data: result.data,
              });
            }
          } catch (error) {
            console.error('支付状态查询失败:', error);
            // 即使查询失败，也认为支付可能成功了
            resolve({
              success: true,
              message: '支付完成，请稍后刷新查看结果',
              uncertain: true,
            });
          }
        },
        fail: (err) => {
          console.error('微信支付失败:', err);

          let message = '支付失败，请重试';
          if (err.errMsg) {
            if (err.errMsg.includes('cancel')) {
              message = '支付已取消';
            } else if (err.errMsg.includes('fail')) {
              message = '支付失败，请检查支付信息';
            }
          }

          reject({
            success: false,
            message,
            error: err,
            cancelled: err.errMsg && err.errMsg.includes('cancel'),
          });
        }
      });
    });
  }

  // 显示支付结果
  static showPaymentResult(result, options = {}) {
    const {
      successCallback = null,
      failCallback = null,
      showToast = true,
    } = options;

    if (result.success) {
      if (showToast) {
        wx.showToast({
          title: result.message || '支付成功',
          icon: 'success',
          duration: 2000,
        });
      }

      if (successCallback) {
        setTimeout(() => successCallback(result), 1000);
      }
    } else {
      if (showToast && !result.cancelled) {
        wx.showToast({
          title: result.message || '支付失败',
          icon: 'none',
          duration: 2000,
        });
      }

      if (failCallback) {
        setTimeout(() => failCallback(result), 500);
      }
    }
  }

  // 创建支付并处理结果的完整流程
  static async createAndPay(paymentRequest, options = {}) {
    const {
      successCallback = null,
      failCallback = null,
      loadingText = '创建支付订单...',
    } = options;

    try {
      // 显示加载
      wx.showLoading({ title: loadingText });

      // 创建支付订单
      const paymentData = await paymentRequest();

      if (!paymentData || !paymentData.paymentId) {
        throw new Error('支付订单创建失败');
      }

      wx.hideLoading();

      // 执行微信支付
      const result = await this.handleWechatPayResult(paymentData, paymentData.paymentId);

      // 显示结果
      this.showPaymentResult(result, { successCallback, failCallback });

      return result;
    } catch (error) {
      wx.hideLoading();
      console.error('支付流程失败:', error);

      const result = {
        success: false,
        message: error.message || '支付失败',
        error,
      };

      this.showPaymentResult(result, { failCallback, showToast: !error.cancelled });

      return result;
    }
  }
}

module.exports = PaymentUtils;