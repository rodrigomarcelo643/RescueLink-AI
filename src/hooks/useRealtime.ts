import { useEffect } from 'react'
import { supabase } from '@/services/supabase'

export function useRealtime(onNewTicket: (ticket: unknown) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('rescue_tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
        (payload) => onNewTicket(payload.new))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onNewTicket])
}
