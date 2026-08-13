import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getIncidents } from '@/services/incidents.service'
import { setIncidents, addIncident, updateIncident, setLoading } from '@/redux/slices/incidentSlice'
import { supabase } from '@/services/supabase'
import type { RootState } from '@/redux/store'
import type { Incident } from '@/types/incident'

export function useIncidents() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s: RootState) => s.incidents)

  useEffect(() => {
    dispatch(setLoading(true))
    getIncidents()
      .then((data) => dispatch(setIncidents(data)))
      .finally(() => dispatch(setLoading(false)))

    const channel = supabase
      .channel('rescue_tickets_realtime_all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
        (payload) => dispatch(addIncident(payload.new as Incident))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rescue_tickets' },
        (payload) => dispatch(updateIncident(payload.new as Incident))
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dispatch])

  return { items, loading }
}
