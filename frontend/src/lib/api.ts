import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  setup: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/setup', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Chat
export const chatAPI = {
  getConversations: (params?: any) => api.get('/chat/conversations', { params }),
  getMessages: (id: string, params?: any) =>
    api.get(`/chat/conversations/${id}/messages`, { params }),
  sendMessage: (id: string, data: any) =>
    api.post(`/chat/conversations/${id}/messages`, data),
  uploadFile: (id: string, formData: FormData) =>
    api.post(`/chat/conversations/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Contacts
export const contactsAPI = {
  getAll: (params?: any) => api.get('/contacts', { params }),
  getOne: (id: string) => api.get(`/contacts/${id}`),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
};

// Leads
export const leadsAPI = {
  getAll: (params?: any) => api.get('/leads', { params }),
  getPipeline: () => api.get('/leads/pipeline'),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
};

// Analytics
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  conversations: (params?: any) => api.get('/analytics/conversations', { params }),
  whatsapp: () => api.get('/analytics/whatsapp'),
};

// Settings
export const settingsAPI = {
  getBot: () => api.get('/settings/bot'),
  updateBot: (data: any) => api.put('/settings/bot', data),
  addKnowledge: (data: any) => api.post('/settings/knowledge', data),
  deleteKnowledge: (id: string) => api.delete(`/settings/knowledge/${id}`),
  getUsers: () => api.get('/settings/users'),
};

export default api;
