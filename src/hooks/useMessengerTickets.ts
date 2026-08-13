import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'

export interface MessengerConversation {
  sender_id: string
  last_message: string
  last_at: string
  last_sender_type: string
}

export function useMessengerTickets() {
  const [conversations, setConversations] = useState<MessengerConversation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('messenger_threads')
      .select('sender_id, text, created_at, sender_type')
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) { setLoading(false); return }

    // Data is ordered desc — first occurrence per sender_id is the latest message
    const seen = new Set<string>()
    const citizenSenders = new Set(data.filter(r => r.sender_type === 'citizen').map((r: { sender_id: string }) => r.sender_id))
    const convos: MessengerConversation[] = []
    for (const row of data) {
      if (!citizenSenders.has(row.sender_id)) continue
      if (seen.has(row.sender_id)) continue
      seen.add(row.sender_id)
      convos.push({ sender_id: row.sender_id, last_message: row.text, last_at: row.created_at, last_sender_type: row.sender_type })
    }
    setConversations(convos)
    setLoading(false)
  }

  useEffect(() => {
    fetchConversations()

    const channel = supabase
      .channel('messenger_tickets_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messenger_threads' },
        () => fetchConversations()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { conversations, loading }
}
