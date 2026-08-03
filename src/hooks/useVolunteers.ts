import { useEffect, useState } from 'react'
import { getVolunteers } from '@/services/volunteers.service'
import type { Volunteer } from '@/types/volunteer'

export function useVolunteers() {
  const [items, setItems] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getVolunteers()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  return { items, loading }
}
