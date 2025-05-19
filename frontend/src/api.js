import axios from 'axios';
import { toast } from 'react-toastify';
console.log('🔗 BASE URL:', import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL + '/api' || 'http://localhost:8888',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  

// 🔁 Перехватчик ошибок
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('❌ API Error:', err);
    toast.error('Ошибка API: ' + (err.response?.data?.message || err.message));
    return Promise.reject(err);
  }
);

export default api;
