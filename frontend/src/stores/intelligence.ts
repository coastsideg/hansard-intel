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
      const { data } = await api.post('/chat/', { query: question })
      
      // If backend returns a JSON string inside a 'response' field, parse it
      let content = data.response || data.answer || 'No data found.'
      
      try {
        const parsed = JSON.parse(content)
        content = parsed.response || content
      } catch (e) {
        // Not JSON, use as is
      }

      set({ response: content, loading: false })
    } catch (error) {
      set({ response: 'Error: Connection failed.', loading: false })
    }
  }
}))
