import { supabase } from './supabase'

export interface ThreadMessage {
  id: string
  sender_id: string
  sender_type: 'citizen' | 'lgu'
  text: string
  created_at: string
}

// Load existing thread messages for a FB sender
export async function getThreadMessages(fbSenderId: string): Promise<ThreadMessage[]> {
  const { data } = await supabase
    .from('messenger_threads')
    .select('*')
    .eq('sender_id', fbSenderId)
    .order('created_at', { ascending: true })
  return data ?? []
}

// Send a reply from LGU to citizen via the messenger-webhook edge function
export async function replyToFbSender(fbSenderId: string, text: string) {
  const { error, data } = await supabase.functions.invoke('messenger-webhook', {
    body: { _lgu_reply: true, recipient_id: fbSenderId, text },
  })
  if (error) throw error
  if (data && typeof data === 'object' && 'error' in data) throw new Error(JSON.stringify(data))
}

// Realtime subscription to new messages in a thread
export function subscribeToThread(
  fbSenderId: string,
  onMessage: (msg: ThreadMessage) => void,
) {
  return supabase
    .channel(`thread_${fbSenderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messenger_threads',
        filter: `sender_id=eq.${fbSenderId}`,
      },
      (payload) => onMessage(payload.new as ThreadMessage),
    )
    .subscribe()
}
