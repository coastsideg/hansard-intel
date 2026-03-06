import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hansard_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hansard_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// API functions
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
}

export const membersApi = {
  list: (params?: object) => api.get('/members/', { params }),
  get: (id: string) => api.get(`/members/${id}`),
}

export const contributionsApi = {
  list: (params?: object) => api.get('/contributions/', { params }),
}

export const chatApi = {
  ask: (question: string) => 
    api.post('/intelligence/ask', { question, stream: false }),
}

export const adminApi = {
  status: () => api.get('/admin/status'),
  processFailed: () => api.post('/admin/process-failed'),
  harvest: () => api.post('/admin/harvest'),
}
