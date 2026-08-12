import { useState, useEffect, useCallback } from 'react'
import { getResponseAgencies } from '@/services/responseAgencies.service'
import type { ResponseAgency } from '@/types/responseAgency'

export function useResponseAgencies() {
  const [items, setItems] = useState<ResponseAgency[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setItems(await getResponseAgencies()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { items, loading, refresh }
}
