import { supabase } from './supabase'

export const getAdvisories = async () => {
  const { data, error } = await supabase
    .from('public_advisories')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const publishAdvisory = async (advisoryId: string) => {
  const { data, error } = await supabase.functions.invoke('post-advisory', {
    body: { advisoryId },
  })
  if (error) throw error
  return data
}

export const createAdvisory = async (advisory: {
  ticketId: string
  title: string
  body: string
  type: string
}) => {
  const { error } = await supabase.from('public_advisories').insert({
    ticket_id: advisory.ticketId,
    title: advisory.title,
    body: advisory.body,
    type: advisory.type,
  })
  if (error) throw error
}
