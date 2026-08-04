import { useEffect, useState, useCallback } from 'react'
import { getEvacuationCenters } from '@/services/evacuationCenters.service'
import type { EvacuationCenter } from '@/types/evacuationCenter'

export function useEvacuationCenters() {
  const [items, setItems] = useState<EvacuationCenter[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getEvacuationCenters())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { items, loading, refresh: fetch }
}
