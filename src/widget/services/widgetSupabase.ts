import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function initSupabase(url: string, anonKey: string) {
  client = createClient(url, anonKey)
  return client
}

export function getClient() {
  if (!client) throw new Error('Supabase not initialized')
  return client
}

// Send a citizen report message through the edge function
export async function sendWidgetMessage(payload: {
  sessionId: string
  text: string
  channel: 'messenger'
}) {
  const { data, error } = await getClient().functions.invoke('messenger-webhook', {
    body: {
      entry: [{
        messaging: [{
          sender: { id: payload.sessionId },
          message: { text: payload.text },
          timestamp: Date.now(),
        }]
      }]
    },
  })
  if (error) throw error
  return data
}

// Subscribe to bot replies for this session
export function subscribeToReplies(
  sessionId: string,
  onMessage: (text: string) => void,
) {
  const channelName = `widget_replies_${sessionId}_${Math.random().toString(36).substring(2, 9)}`
  return getClient()
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'widget_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.new.sender === 'bot') {
          onMessage(payload.new.text)
        }
      },
    )
    .subscribe()
}
