import { create } from 'zustand'
import api from '../lib/api'

interface IntelligenceState {
  loading: boolean
  response: string | null
  askQuestion: (question: string) => Promise<void>
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  loading: false,
  response: null,
  askQuestion: async (question) => {
    set({ loading: true, response: null })
    try {
      const { data } = await api.post('/chat/', { 
        query: question 
      })
      // Handles both potential backend response keys
      set({ 
        response: data.response || data.answer || 'No data returned.', 
        loading: false 
      })
    } catch (error) {
      set({ 
        response: 'Error: Connection to research backend failed.', 
        loading: false 
      })
    }
  }
}))
