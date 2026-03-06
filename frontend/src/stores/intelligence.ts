import { create } from 'zustand'
import api from '../lib/api'

interface IntelligenceState {
  loading: boolean
  response: string | null
  askQuestion: (question: string, member?: string, issue?: string) => Promise<void>
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  loading: false,
  response: null,
  askQuestion: async (question, member, issue) => {
    set({ loading: true, response: null })
    try {
      // INSTRUCTION: Tells the RAG system to ignore temporal bias and search the full index
      const globalQuery = `SEARCH ALL HISTORICAL RECORDS: Identify all relevant Hansard contributions for ${member || 'any member'} regarding ${issue || 'any issue'}. Include results from all years in the database. Query: ${question}`

      const { data } = await api.post('/chat/', { 
        query: globalQuery 
      })
      
      let content = data.response || data.answer || 'No data found.'
      
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
