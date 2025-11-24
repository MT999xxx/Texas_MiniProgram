const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');

    // 获取token
    const token = wx.getStorageSync('token');

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      ...options.header,
    };

    // 添加Authorization头
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    wx.request({
      ...options,
      url: `${apiBase}${options.url}`,
      header: headers,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token过期或无效
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');

          // 不是登录接口的话，跳转到登录页面
          if (!options.url.includes('/auth/')) {
            wx.showToast({
              title: '请先登录',
              icon: 'none',
              duration: 2000,
              complete: () => {
                setTimeout(() => {
                  wx.navigateTo({
                    url: '/pages/login/index'
                  });
                }, 1000);
              }
            });
          }

          reject(new Error('未授权'));
        } else {
          const msg = res.data?.message || '请求失败';
          if (!options.silent) {
            wx.showToast({ title: msg, icon: 'none' });
          }
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        if (!options.silent) {
          wx.showToast({ title: '网络异常', icon: 'none' });
        }
        reject(err);
      },
    });
  });
};

// 便捷方法
const api = {
  get: (url, params = {}) => {
    const queryString = Object.keys(params).length > 0
      ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
      : '';
    return request({ url: url + queryString, method: 'GET' });
  },
  post: (url, data, options = {}) => request({ ...options, url, method: 'POST', data }),
  put: (url, data, options = {}) => request({ ...options, url, method: 'PUT', data }),
  delete: (url, options = {}) => request({ ...options, url, method: 'DELETE' }),
};

// 向后兼容：支持 request.get() 和 api.get() 两种用法
request.get = api.get;
request.post = api.post;
request.put = api.put;
request.delete = api.delete;

module.exports = request;
module.exports.api = api;
module.exports.default = request;
