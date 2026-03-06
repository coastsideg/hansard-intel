import { create } from 'zustand'
import api from '../lib/api'

interface AuthState {
  token: string | null
  user: { username: string } | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (u: string, p: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('hansard_token'),
  user: localStorage.getItem('hansard_token') ? { username: 'Admin' } : null,
  isAuthenticated: !!localStorage.getItem('hansard_token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('hansard_token', data.access_token)
      set({ 
        token: data.access_token, 
        isAuthenticated: true, 
        user: { username }, 
        loading: false 
      })
      return true
    } catch (err: any) {
      set({ error: 'Invalid credentials', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('hansard_token')
    set({ token: null, isAuthenticated: false, user: null })
  }
}))
