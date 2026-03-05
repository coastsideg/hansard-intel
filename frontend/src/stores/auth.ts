import { create } from 'zustand'
import api from '../lib/api'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('hansard_token'),
  isAuthenticated: !!localStorage.getItem('hansard_token'),

  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { access_token } = res.data
    localStorage.setItem('hansard_token', access_token)
    set({ token: access_token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('hansard_token')
    set({ token: null, isAuthenticated: false })
  },
}))
