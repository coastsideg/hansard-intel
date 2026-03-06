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
      const { data } = await api.post('/intelligence/ask', { question })
      set({ response: data.answer, loading: false })
    } catch {
      set({ response: 'Error retrieving response.', loading: false })
    }
  }
}))
