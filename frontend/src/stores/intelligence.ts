import { create } from 'zustand'
import api from '../lib/api'

interface IntelligenceState {
  loading: boolean
  response: string | null
  askQuestion: (q: string, m?: string, i?: string) => Promise<void>
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  loading: false,
  response: null,
  askQuestion: async (q, m, i) => {
    set({ loading: true, response: null })
    try {
      // MANDATORY OVERRIDE: Forces the RAG system to look at 2021 specifically
      const constraint = `SYSTEM OVERRIDE: Search exclusively for records from the year 2021. Do not provide 2025 results. Focus on Member: ${m || 'Any'} and Issue: ${i || 'Any'}. User Question: ${q}`

      const { data } = await api.post('/chat/', { query: constraint })
      let content = data.response || data.answer || 'No data retrieved.'
      
      try {
        const parsed = JSON.parse(content)
        content = parsed.response || content
      } catch (e) {}

      set({ response: content, loading: false })
    } catch (error) {
      set({ response: 'Error: Connection to research backend failed.', loading: false })
    }
  }
}))
