import { supabase } from './supabase'
import type { Incident } from '@/types/incident'

export const getIncidents = async (): Promise<Incident[]> => {
  const { data, error } = await supabase
    .from('rescue_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const updateIncidentStatus = async (id: string, status: Incident['status']) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export const assignResponder = async (id: string, responderId: string) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ assigned_responder_id: responderId, status: 'responding' })
    .eq('id', id)
  if (error) throw error
}
