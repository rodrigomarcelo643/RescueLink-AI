import { useEffect } from 'react'
import { supabase } from '@/services/supabase'

export function useRealtime(onNewTicket: (ticket: unknown) => void) {
  useEffect(() => {
    const channelName = `rescue_tickets_hook_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
        (payload) => onNewTicket(payload.new))
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [onNewTicket])
}
