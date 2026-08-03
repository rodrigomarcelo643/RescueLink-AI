import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getDonations } from '@/services/donations.service'
import { setDonations, setLoading } from '@/redux/slices/donationSlice'
import type { RootState } from '@/redux/store'

export function useDonations() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s: RootState) => s.donations)

  useEffect(() => {
    dispatch(setLoading(true))
    getDonations()
      .then((data) => dispatch(setDonations(data)))
      .finally(() => dispatch(setLoading(false)))
  }, [dispatch])

  return { items, loading }
}
