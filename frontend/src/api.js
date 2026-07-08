import axios from 'axios';

const hostname = window.location.hostname;
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${hostname}:8000/api`,
});

// Adiciona o token em todos os pedidos
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;