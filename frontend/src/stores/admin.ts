import { create } from 'zustand'
import api from '../lib/api'

interface AdminState {
  status: any
  loading: boolean
  fetchStatus: () => Promise<void>
  processFailed: () => Promise<void>
  harvest: () => Promise<void>
}

export const useAdminStore = create<AdminState>((set) => ({
  status: null,
  loading: false,
  fetchStatus: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/admin/status')
      set({ status: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  processFailed: async () => {
    await api.post('/admin/process-failed')
  },
  harvest: async () => {
    await api.post('/admin/harvest')
  }
}))
