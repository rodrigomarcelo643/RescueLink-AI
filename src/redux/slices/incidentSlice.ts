import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Incident } from '@/types/incident'

interface IncidentState {
  items: Incident[]
  loading: boolean
}

const initialState: IncidentState = { items: [], loading: false }

const incidentSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setIncidents(state, action: PayloadAction<Incident[]>) {
      state.items = action.payload
    },
    addIncident(state, action: PayloadAction<Incident>) {
      state.items.unshift(action.payload)
    },
    updateIncident(state, action: PayloadAction<Incident>) {
      const idx = state.items.findIndex((i) => i.id === action.payload.id)
      if (idx !== -1) state.items[idx] = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setIncidents, addIncident, updateIncident, setLoading } = incidentSlice.actions
export default incidentSlice.reducer
