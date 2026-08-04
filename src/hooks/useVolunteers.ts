import { useEffect, useState, useCallback } from 'react'
import { getVolunteers } from '@/services/volunteers.service'
import type { Volunteer } from '@/types/volunteer'

export function useVolunteers() {
  const [items, setItems] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    return getVolunteers()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, refresh }
}

