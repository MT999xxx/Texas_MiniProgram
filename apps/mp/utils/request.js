const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');

    const token = wx.getStorageSync('token');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.header,
    };

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
          console.warn(`[API 401] ${options.url}`);
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');

          if (!options.url.includes('/auth/')) {
            wx.showToast({
              title: '请先登录',
              icon: 'none',
              duration: 2000,
              complete: () => {
                setTimeout(() => {
                  wx.navigateTo({
                    url: '/pages/login/index',
                  });
                }, 1000);
              },
            });
          }

          const error = new Error('未授权');
          error.statusCode = res.statusCode;
          reject(error);
        } else {
          console.error(`[API Error] ${res.statusCode} ${options.url}`, res.data);
          const msg = res.data?.message || '请求失败';
          if (!options.silent) {
            wx.showToast({ title: msg, icon: 'none' });
          }
          const error = new Error(msg);
          error.statusCode = res.statusCode;
          reject(error);
        }
      },
      fail: (err) => {
        console.error(`[Network Error] ${options.url}`, err);
        if (!options.silent) {
          wx.showToast({ title: '网络异常', icon: 'none' });
        }
        reject(err);
      },
    });
  });
};

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

request.get = api.get;
request.post = api.post;
request.put = api.put;
request.delete = api.delete;

const uploadFile = (filePath, url = '/uploads/avatar', name = 'file') => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');
    const token = wx.getStorageSync('token');

    wx.uploadFile({
      url: `${apiBase}${url}`,
      filePath,
      name,
      header: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('上传文件失败:', err);
        reject(err);
      },
    });
  });
};

module.exports = request;
module.exports.api = api;
module.exports.uploadFile = uploadFile;
module.exports.default = request;
