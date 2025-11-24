import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000',
  timeout: 10_000,
});

// 请求拦截器 - 自动添加token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || error.message;

    // 401未授权 - 跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  },
);

export default client;
