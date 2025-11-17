const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');
    wx.request({
      ...options,
      url: `${apiBase}${options.url}`,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = res.data?.message || '请求失败';
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
};

module.exports = { request };
