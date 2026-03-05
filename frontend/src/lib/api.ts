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
  stats: (id: string) => api.get(`/members/${id}/stats`),
}

export const contributionsApi = {
  list: (params?: object) => api.get('/contributions/', { params }),
  overview: () => api.get('/contributions/stats/overview'),
  recentAttacks: (days?: number) => api.get('/contributions/recent-attacks', { params: { days } }),
}

export const chatApi = {
  send: (query: string, sessionId?: string) =>
    api.post('/chat/', { query, session_id: sessionId }),
  sessions: () => api.get('/chat/sessions'),
  messages: (sessionId: string) => api.get(`/chat/sessions/${sessionId}/messages`),
}

export const digestApi = {
  latest: () => api.get('/digest/latest'),
  generate: (date?: string) => api.post('/digest/generate', null, { params: { target_date: date } }),
}

export const adminApi = {
  status: () => api.get('/admin/status'),
  historicalScrape: (fromYear: number) => api.post('/admin/scrape/historical', { from_year: fromYear }),
  dailyScrape: () => api.post('/admin/scrape/daily'),
  seedMembers: () => api.post('/admin/seed-members'),
}
