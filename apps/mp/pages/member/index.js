// pages/member/index.js
const authManager = require('../../utils/auth');
const coinsApi = require('../../api/coins');
const util = require('../../utils/util');
const PaymentUtils = require('../../utils/payment');
const { getMembershipLevel } = require('../../utils/membership-levels');

const MEMBER_LEVEL_THRESHOLDS = [0, 1000, 3000, 10000, 20000, 30000, 40000, 50000, 60000, 70000];

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false, // 添加登录状态
    memberId: '', // 添加会员ID
    userInfo: {
      avatar: '/images/huiyuan2.jpg', // 暂时使用通用图标
      nickname: '点击登录',
      id: ''
    },
    memberInfo: {
      level: 'V1',
      levelNum: 1,
      levelName: '尊荣白银',
      levelIcon: '/images/membership/v1.jpg',
      nextLevelDiff: 1000,
      isMaxLevel: false,
      totalRechargeAmount: 0,
      growthPercent: 0
    },
    stats: {
      coins: 0,
      points: 0,
      wineVouchers: 0
    },
    menuList: [
      { icon: '/images/icons/orders-gold.svg', text: '我的订单', url: '/pages/order-list/index' },
      { icon: '/images/icons/reserve-gold.svg', text: '我的预约', url: '/pages/reservation/index' },
      { icon: '/images/icons/coupon-gold.svg', text: '我的优惠券', url: '/pages/coupons/index?tab=AVAILABLE' },
    ],

    // 充值弹窗
    showRechargePopup: false,
    rechargeOptions: [
      { amount: 500, coins: 560, bonusCoins: 60, bonus: 30000, desc: '到账560金币（赠60）· 赠送30000积分' },
      { amount: 1000, coins: 1150, bonusCoins: 150, bonus: 80000, desc: '到账1150金币（赠150）· 赠送80000积分' },
      { amount: 2000, coins: 2400, bonusCoins: 400, bonus: 200000, desc: '到账2400金币（赠400）· 赠送200000积分' },
      { amount: 5000, coins: 6000, bonusCoins: 1000, bonus: 600000, desc: '到账6000金币（赠1000）· 赠送600000积分' }
    ],
    selectedAmount: 500,
    inputAmount: '',

    // 存积分弹窗
    showDepositPopup: false,
    depositAmount: '',

    // 取积分弹窗
    showWithdrawPopup: false,
    withdrawAmount: '',
    showPointRecordsPopup: false,
    pointRecordsLoading: false,
    pointRecords: [],

    // 酒券购买弹窗
    showExchangePopup: false,
    voucherPackages: [
      { id: 'member-voucher-disabled', name: '月赛畅饮券', price: 138, voucherCount: 1, description: '15天有效，赠送8000积分' },
      { id: 'sng-wine-set', name: 'SNG酒券套餐', price: 78, voucherCount: 1, description: '15天有效，赠送8000积分' },
      { id: 'budweiser-duo', name: '百威啤酒2瓶', price: 99, voucherCount: 1, description: '15天有效，赠送8000积分' },
      { id: 'cocktail-single', name: '鸡尾酒一杯', price: 99, voucherCount: 1, description: '15天有效，赠送8000积分' }
    ],
    purchasingVoucherId: '',
    voucherExpiryReminder: '',

    // 邮请奖励
    showInvitePopup: false,
    inviteCode: '',
    inputInviteCode: '',
    invitedUsers: [],
    loading: true // 初始加载状态
  },

  /**
   * 点击头像/用户信息
   */
  onUserInfoClick() {
    if (!this.data.isLogin) {
      // 未登录，跳转登录页
      wx.navigateTo({
        url: '/pages/login/index'
      });
    }
  },

  /**
   * 头像加载失败时使用默认头像
   */
  onAvatarError() {
    console.log('头像加载失败，使用默认头像');
    this.setData({
      'userInfo.avatar': '/images/huiyuan2.jpg'
    });
  },

  /**
   * 检查头像URL是否有效（排除临时路径和无效URL）
   */
  isValidAvatarUrl(url) {
    if (!url) return false;
    // 临时文件路径无效
    if (url.startsWith('http://tmp')) return false;
    if (url.startsWith('wxfile://')) return false;
    // 本地图片或 HTTPS URL 有效
    if (url.startsWith('/images/')) return true;
    if (url.startsWith('https://')) return true;
    return false;
  },

  /**
   * 菜单项点击
   */
  onMenuClick(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.menuList[index];

    if (item && item.url) {
      wx.navigateTo({
        url: item.url,
        fail: () => {
          // 如果navigateTo失败（可能是tabbar页面），尝试switchTab
          wx.switchTab({ url: item.url });
        }
      });
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到会员等级权益页面
   */
  goToMemberLevel() {
    wx.navigateTo({
      url: '/pages/member-level/index'
    });
  },

  // ========== 邮请奖励功能 ==========
  /**
   * 显示邮请奖励弹窗
   */
  showInvitePopup() {
    this.setData({ showInvitePopup: true });
  },

  /**
   * 隐藏邮请奖励弹窗
   */
  hideInvitePopup() {
    this.setData({ showInvitePopup: false });
  },

  /**
   * 复制邀请码
   */
  copyInviteCode() {
    const code = this.data.inviteCode || 'e7f0014b';
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.vibrateShort({ type: 'light' });
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      }
    });
  },

  /**
   * 输入邀请码
   */
  onInviteCodeInput(e) {
    this.setData({ inputInviteCode: e.detail.value });
  },

  /**
   * 提交邀请码
   */
  submitInviteCode() {
    const code = this.data.inputInviteCode.trim();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    // TODO: 调用后端API绑定邀请关系
    wx.showLoading({ title: '提交中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '绑定成功', icon: 'success' });
      this.setData({ inputInviteCode: '' });
    }, 1000);
  },

  /**
   * 查看已邀请用户列表
   */
  showInvitedList() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
    // TODO: 跳转到已邀请用户列表页面
  },

  /**
   * 充值按钮点击
   */
  onRecharge() {
    this.setData({
      showRechargePopup: true
    });
  },

  /**
   * 隐藏充值弹窗
   */
  hideRecharge() {
    this.setData({
      showRechargePopup: false
    });
  },

  /**
   * 选择充值金额
   */
  selectAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({
      selectedAmount: amount,
      inputAmount: '' // 选择预设时清空输入框
    });
  },

  /**
   * 输入自定义金额
   */
  onInputAmount(e) {
    const value = e.detail.value;
    this.setData({
      inputAmount: value,
      selectedAmount: 0 // 输入时取消预设选中
    });
  },

  /**
   * 清除输入
   */
  clearInput() {
    this.setData({
      inputAmount: '',
      selectedAmount: 500 // 清除后默认选中第一个
    });
  },

  /**
   * 提交充值
   */
  submitRecharge() {
    const amount = this.data.inputAmount || this.data.selectedAmount;
    if (!amount) {
      wx.showToast({
        title: '请选择或输入金额',
        icon: 'none'
      });
      return;
    }

    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 获取 openid（与其他支付流程保持一致）
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({ title: '请重新登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发起支付...' });
    coinsApi.createRecharge(Number(amount), openid)
      .then(res => {
        wx.hideLoading();
        const paymentId = res.paymentId; // 保存支付ID用于后续查询
        // 调用微信支付
        wx.requestPayment({
          timeStamp: res.timeStamp,
          nonceStr: res.nonceStr,
          package: res.package,
          signType: res.signType || 'RSA',
          paySign: res.paySign,
          success: async () => {
            // 支付成功后，主动查询支付状态来触发后端处理（防止回调延迟）
            wx.showLoading({ title: '处理中...' });
            try {
              const result = await PaymentUtils.pollPaymentStatus(paymentId, {
                maxAttempts: 12,
                interval: 1000,
                timeout: 20000,
              });

              wx.hideLoading();
              if (result.isPaid) {
                wx.vibrateShort({ type: 'medium' });
                wx.showToast({ title: '充值成功', icon: 'success' });
                this.hideRecharge();
                this.loadBalance();
                return;
              }

              this.loadBalance();
              wx.showModal({
                title: '入账确认中',
                content: '微信支付已返回成功，但后端暂未确认入账。请稍后刷新会员中心，或联系工作人员核对。',
                showCancel: false,
                confirmText: '知道了',
              });
            } catch (error) {
              wx.hideLoading();
              this.loadBalance();
              wx.showModal({
                title: '入账确认中',
                content: '支付结果确认失败，请稍后刷新会员中心。如余额仍未变化，请联系工作人员。',
                showCancel: false,
                confirmText: '知道了',
              });
            }
          },
          fail: (err) => {
            if (err.errMsg.includes('cancel')) {
              wx.showToast({ title: '已取消支付', icon: 'none' });
            } else {
              wx.showToast({ title: '支付失败', icon: 'none' });
            }
          }
        });
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '充值失败', icon: 'none' });
      });
  },

  // ========== 存积分 ==========
  showDepositDialog() {
    this.setData({ showDepositPopup: true, depositAmount: '' });
  },
  hideDepositDialog() {
    this.setData({ showDepositPopup: false });
  },
  onDepositInput(e) {
    this.setData({ depositAmount: e.detail.value });
  },
  clearDepositInput() {
    this.setData({ depositAmount: '' });
  },
  submitDeposit() {
    const points = parseInt(this.data.depositAmount);
    if (!points || points <= 0) {
      wx.showToast({ title: '请输入有效的积分数量', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    coinsApi.depositPoints(this.data.memberId, points)
      .then(res => {
        wx.hideLoading();
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '申请已提交，等待审核', icon: 'success' });
        this.hideDepositDialog();
        if (this.data.showPointRecordsPopup) {
          this.loadPointRecords();
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      });
  },

  // ========== 取积分 ==========
  showWithdrawDialog() {
    this.setData({ showWithdrawPopup: true, withdrawAmount: '' });
  },
  hideWithdrawDialog() {
    this.setData({ showWithdrawPopup: false });
  },
  onWithdrawInput(e) {
    this.setData({ withdrawAmount: e.detail.value });
  },
  clearWithdrawInput() {
    this.setData({ withdrawAmount: '' });
  },
  submitWithdraw() {
    const points = parseInt(this.data.withdrawAmount);
    if (!points || points <= 0) {
      wx.showToast({ title: '请输入有效的积分数量', icon: 'none' });
      return;
    }
    if (points > this.data.stats.points) {
      wx.showToast({ title: '积分余额不足', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '取积分中...' });
    coinsApi.withdrawPoints(this.data.memberId, points)
      .then(res => {
        wx.hideLoading();
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '取积分成功', icon: 'success' });
        this.hideWithdrawDialog();
        this.loadBalance();
        if (this.data.showPointRecordsPopup) {
          this.loadPointRecords();
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      });
  },

  showPointRecordsDialog() {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ showPointRecordsPopup: true });
    this.loadPointRecords();
  },

  hidePointRecordsDialog() {
    this.setData({ showPointRecordsPopup: false });
  },

  loadPointRecords() {
    if (!this.data.memberId) return;

    this.setData({ pointRecordsLoading: true });
    coinsApi.getPointRecords(this.data.memberId)
      .then(records => {
        this.setData({
          pointRecords: (records || []).map(item => this.formatPointRecord(item)),
          pointRecordsLoading: false
        });
      })
      .catch(err => {
        this.setData({ pointRecordsLoading: false });
        wx.showToast({ title: err.message || '记录加载失败', icon: 'none' });
      });
  },

  formatPointRecord(record) {
    const isWithdraw = record.type === 'WITHDRAW';
    const points = Number(record.points || record.actualPoints || 0);
    return {
      ...record,
      pointsText: `${isWithdraw ? '-' : '+'}${points}`,
      directionClass: isWithdraw ? 'minus' : 'plus',
      createdAtText: this.formatRecordTime(record.createdAt),
      remark: record.remark || ''
    };
  },

  formatRecordTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  // ========== 酒券购买 ==========
  showExchangeDialog() {
    wx.navigateTo({ url: '/pages/coupons/index?tab=AVAILABLE' });
  },
  hideExchangeDialog() {
    this.setData({ showExchangePopup: false, purchasingVoucherId: '' });
  },
  purchaseVoucher(e) {
    if (this.data.purchasingVoucherId) return;
    const packageId = e.currentTarget.dataset.id;
    const item = this.data.voucherPackages.find(v => v.id === packageId);
    if (!item) {
      this.showVoucherPurchaseResult('购买失败', '酒券套餐不存在');
      return;
    }
    if (!this.data.isLogin) {
      this.showVoucherPurchaseResult('购买失败', '请先登录后再购买酒券');
      return;
    }
    if (Number(this.data.stats.coins || 0) < Number(item.price || 0)) {
      this.showVoucherPurchaseResult('购买失败', `金币余额不足，需要${item.price}金币`);
      return;
    }
    this.setData({ purchasingVoucherId: packageId });
    wx.showLoading({ title: '购买中...' });
    coinsApi.purchaseMemberVoucherDisabled(this.data.memberId, packageId)
      .then(res => {
        wx.hideLoading();
        wx.vibrateShort({ type: 'medium' });
        this.hideExchangeDialog();
        this.loadBalance();
        this.showVoucherPurchaseResult(
          '购买成功',
          `已获得${item.voucherCount || 1}张${item.name}，可在我的优惠券查看`,
          true
        );
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ purchasingVoucherId: '' });
        this.showVoucherPurchaseResult('购买失败', err.message || '购买失败，请稍后再试');
      });
  },

  showVoucherPurchaseResult(title, content, canViewCoupons = false) {
    wx.showModal({
      title,
      content,
      showCancel: canViewCoupons,
      confirmText: canViewCoupons ? '去查看' : '知道了',
      cancelText: '继续购买',
      success: (res) => {
        if (canViewCoupons && res.confirm) {
          wx.navigateTo({ url: '/pages/coupons/index?tab=AVAILABLE' });
        }
      }
    });
  },

  /**
   * 加载余额和等级信息
   */
  loadBalance() {
    if (!this.data.memberId) return;
    coinsApi.getBalance(this.data.memberId)
      .then(res => {
        // 使用动画显示数字
        util.animateNumber(this, 'stats.coins', res.coins || 0);
        util.animateNumber(this, 'stats.points', res.points || 0);

        // 解析等级编码，并按累计充值门槛显示升级进度
        const level = getMembershipLevel(res.levelCode);
        const levelCode = level.code;
        const levelNum = level.level;
        const totalRechargeAmount = Number(res.totalRechargeAmount || 0);
        const currentThreshold = MEMBER_LEVEL_THRESHOLDS[levelNum - 1] || 0;
        const nextThreshold = MEMBER_LEVEL_THRESHOLDS[levelNum];
        const isMaxLevel = levelNum >= MEMBER_LEVEL_THRESHOLDS.length;
        const segmentSize = isMaxLevel ? 1 : Math.max(1, nextThreshold - currentThreshold);
        const growthPercent = isMaxLevel
          ? 100
          : Math.min(100, Math.max(0, ((totalRechargeAmount - currentThreshold) / segmentSize) * 100));

        this.setData({
          'stats.wineVouchers': res.wineVouchers ?? 0,
          voucherExpiryReminder: res.wineVoucherExpiryReminder || '',
          'memberInfo.level': levelCode,
          'memberInfo.levelNum': levelNum,
          'memberInfo.levelName': level.name,
          'memberInfo.levelIcon': level.icon,
          'memberInfo.totalRechargeAmount': totalRechargeAmount,
          'memberInfo.nextLevelDiff': isMaxLevel ? 0 : Math.max(0, nextThreshold - totalRechargeAmount),
          'memberInfo.isMaxLevel': isMaxLevel,
          'memberInfo.growthPercent': growthPercent,
          loading: false
        });
        if (res.wineVoucherExpiryReminder) {
          wx.showToast({ title: res.wineVoucherExpiryReminder, icon: 'none', duration: 2600 });
        }
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  /**
   * 菜单点击
   */
  onMenuClick(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.menuList[index];
    if (item.url) {
      wx.navigateTo({
        url: item.url
      });
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          authManager.clearAuth();
          // Reset page data
          this.setData({
            isLogin: false,
            userInfo: {
              avatar: '/images/huiyuan2.jpg',
              nickname: '点击登录',
              id: ''
            },
            stats: {
              coins: 0,
              points: 0,
              wineVouchers: 0
            }
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          // 如果app.js有全局用户信息也需要清理
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = null;
          }
        }
      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    // 检查登录状态
    try {
      const isLoggedIn = await authManager.checkLogin();
      if (isLoggedIn) {
        const userInfo = authManager.getUserInfo();
        // Update globalData in app.js if needed, though this is a page context
        // getApp().globalData.userInfo = userInfo; // Example if app.js needs it
        console.log('自动登录成功:', userInfo);
        // 验证头像URL，无效则使用默认头像
        const validAvatar = this.isValidAvatarUrl(userInfo.avatar) ? userInfo.avatar : '/images/huiyuan2.jpg';
        this.setData({
          isLogin: true,
          memberId: userInfo.memberId || userInfo.id || '',
          userInfo: {
            avatar: validAvatar,
            nickname: userInfo.nickname || userInfo.nickName || '爱好者', // Handle both nickName and nickname
            id: userInfo.id || ''
          }
        });
        // 加载余额信息
        this.loadBalance();
      } else {
        this.setData({
          isLogin: false,
          memberId: '',
          userInfo: {
            avatar: '/images/huiyuan2.jpg',
            nickname: '点击登录',
            id: ''
          }
        });
      }
    } catch (error) {
      console.warn('自动登录过程异常:', error);
      this.setData({
        isLogin: false,
        loading: false,
        userInfo: {
          avatar: '/images/huiyuan2.jpg',
          nickname: '点击登录',
          id: ''
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  stopBubble() { }
})
