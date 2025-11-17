const { request } = require('../../utils/request');

Page({
  data: {
    tables: [],
    tableNames: [],
    selectedTableName: '',
    form: {
      customerName: '',
      phone: '',
      tableId: '',
      reservedAt: '',
      note: '',
    },
    loading: false,
  },
  onShow() {
    this.fetchTables();
  },
  async fetchTables() {
    const list = await request({ url: '/tables', method: 'GET' });
    this.setData({
      tables: list,
      tableNames: list.map((item) => item.name),
    });
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  onPickTable(e) {
    const index = e.detail.value;
    const table = this.data.tables[index];
    this.setData({
      selectedTableName: table.name,
      'form.tableId': table.id,
    });
  },
  onPickTime(e) {
    this.setData({ 'form.reservedAt': e.detail.value });
  },
  async submit() {
    const { customerName, phone, tableId, reservedAt } = this.data.form;
    if (!customerName || !phone || !tableId || !reservedAt) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      await request({
        url: '/reservations',
        method: 'POST',
        data: {
          ...this.data.form,
          reservedAt: new Date(reservedAt).toISOString(),
        },
      });
      wx.showToast({ title: '预约成功', icon: 'success' });
      this.setData({
        form: {
          customerName: '',
          phone: '',
          tableId: '',
          reservedAt: '',
          note: '',
        },
        selectedTableName: '',
      });
    } catch (err) {
      // 错误提示已经在 request 中处理
    } finally {
      this.setData({ loading: false });
    }
  },
});
