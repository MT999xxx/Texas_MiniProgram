import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10_000,
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  },
);

export default client;
