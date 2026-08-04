import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getDonations } from '@/services/donations.service'
import { setDonations, setLoading } from '@/redux/slices/donationSlice'
import type { RootState } from '@/redux/store'

export function useDonations() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s: RootState) => s.donations)

  const refresh = useCallback(() => {
    dispatch(setLoading(true))
    return getDonations()
      .then((data) => dispatch(setDonations(data)))
      .finally(() => dispatch(setLoading(false)))
  }, [dispatch])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, refresh }
}

