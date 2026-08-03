import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Donation } from '@/types/donation'

interface DonationState {
  items: Donation[]
  loading: boolean
}

const initialState: DonationState = { items: [], loading: false }

const donationSlice = createSlice({
  name: 'donations',
  initialState,
  reducers: {
    setDonations(state, action: PayloadAction<Donation[]>) {
      state.items = action.payload
    },
    addDonation(state, action: PayloadAction<Donation>) {
      state.items.unshift(action.payload)
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setDonations, addDonation, setLoading } = donationSlice.actions
export default donationSlice.reducer
