const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    tables: [],
    tableNames: [],
    selectedTableName: '',
    partySizes: ['1人', '2人', '3人', '4人', '5人', '6人', '7人', '8人', '8人以上'],
    selectedPartySize: '',
    form: {
      customerName: '',
      phone: '',
      partySize: 2,
      tableId: '',
      reservedAt: '',
      note: '',
    },
    loading: false,
    isLoggedIn: false,
    userInfo: null,
  },

  async onLoad() {
    await this.checkLoginStatus();
    await this.fetchTables();
  },

  async onShow() {
    await this.checkLoginStatus();
    await this.fetchTables();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const userInfo = authManager.userInfo;

    this.setData({ isLoggedIn });

    if (isLoggedIn && userInfo) {
      // 自动填充用户信息
      this.setData({
        userInfo,
        'form.customerName': userInfo.nickname || '',
        'form.phone': userInfo.phone || '',
      });
    }
  },

  // 获取桌台列表
  async fetchTables() {
    try {
      const list = await request({ url: '/tables', method: 'GET' });
      // 过滤可用的桌台
      const availableTables = list.filter(t => t.isActive);
      this.setData({
        tables: availableTables,
        tableNames: availableTables.map((item) => `${item.name} (${item.capacity}人座)`),
      });
    } catch (error) {
      console.error('加载桌台失败:', error);
    }
  },

  // 输入框变化
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // 选择人数
  onPickPartySize(e) {
    const index = e.detail.value;
    let partySize = index + 1;
    if (index === 8) {
      partySize = 9; // 8人以上默认设为9
    }
    this.setData({
      selectedPartySize: this.data.partySizes[index],
      'form.partySize': partySize,
    });
  },

  // 选择桌台
  onPickTable(e) {
    const index = e.detail.value;
    const table = this.data.tables[index];
    this.setData({
      selectedTableName: this.data.tableNames[index],
      'form.tableId': table.id,
    });
  },

  // 选择日期
  onPickDate(e) {
    this.setData({ 'form.reservedDate': e.detail.value });
  },

  // 选择时间
  onPickTime(e) {
    this.setData({ 'form.reservedTime': e.detail.value });
  },

  // 提交预约
  async submit() {
    // 检查登录
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '预约功能需要登录后使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/reservation/index')
            });
          }
        }
      });
      return;
    }

    const { customerName, phone, partySize, tableId, reservedDate, reservedTime, note } = this.data.form;

    // 验证表单
    if (!customerName || !phone) {
      wx.showToast({ title: '请填写联系信息', icon: 'none' });
      return;
    }

    if (!tableId) {
      wx.showToast({ title: '请选择桌台', icon: 'none' });
      return;
    }

    if (!reservedDate || !reservedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }

    // 验证手机号
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    // 组合日期时间
    const reservedAt = `${reservedDate} ${reservedTime}:00`;
    const reservedDateTime = new Date(reservedAt);

    // 验证预约时间不能早于当前时间
    if (reservedDateTime < new Date()) {
      wx.showToast({ title: '预约时间不能早于当前时间', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const data = {
        customerName,
        phone,
        partySize,
        tableId,
        reservedAt: reservedDateTime.toISOString(),
        note,
      };

      // 如果已登录，添加会员ID
      if (this.data.userInfo && this.data.userInfo.id) {
        data.memberId = this.data.userInfo.id;
      }

      await request({
        url: '/reservations',
        method: 'POST',
        data,
      });

      wx.showToast({ title: '预约成功', icon: 'success' });

      // 延迟跳转到预约记录页面
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/reservation-list/index',
          fail: () => {
            // 如果页面不存在，返回首页
            wx.switchTab({ url: '/pages/home/index' });
          }
        });
      }, 1500);

      // 清空表单
      this.setData({
        form: {
          customerName: this.data.userInfo?.nickname || '',
          phone: this.data.userInfo?.phone || '',
          partySize: 2,
          tableId: '',
          reservedDate: '',
          reservedTime: '',
          note: '',
        },
        selectedTableName: '',
        selectedPartySize: '',
      });

    } catch (err) {
      console.error('预约失败:', err);
      // 错误提示已经在 request 中处理
    } finally {
      this.setData({ loading: false });
    }
  },

  // 查看我的预约
  viewMyReservations() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/reservation-list/index',
      fail: () => {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
      }
    });
  }
});
