import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import incidentReducer from './slices/incidentSlice'
import donationReducer from './slices/donationSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentReducer,
    donations: donationReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
