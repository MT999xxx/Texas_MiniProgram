const request = (options = {}) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');

    // 获取token
    const token = wx.getStorageSync('token');

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
          console.warn(`[API 401] ${options.url}`);
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
          console.error(`[API Error] ${res.statusCode} ${options.url}`, res.data);
          const msg = res.data?.message || '请求失败';
          if (!options.silent) {
            wx.showToast({ title: msg, icon: 'none' });
          }
          reject(new Error(msg));
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

/**
 * 上传文件到服务器
 * @param {string} filePath - 本地文件临时路径
 * @param {string} url - 上传接口路径
 * @param {string} name - 文件字段名，默认 'file'
 */
const uploadFile = (filePath, url = '/uploads/avatar', name = 'file') => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const apiBase = (app?.globalData?.apiBase || 'http://localhost:3000').replace(/\/$/, '');
    const token = wx.getStorageSync('token');

    wx.uploadFile({
      url: `${apiBase}${url}`,
      filePath: filePath,
      name: name,
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
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

