import { supabase } from './supabase'
import type { EvacuationCenter } from '@/types/evacuationCenter'

export const getEvacuationCenters = async (): Promise<EvacuationCenter[]> => {
  const { data, error } = await supabase
    .from('evacuation_centers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const addEvacuationCenter = async (data: Omit<EvacuationCenter, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('evacuation_centers').insert(data)
  if (error) throw error
}

export const updateEvacuationCenter = async (id: string, data: Partial<EvacuationCenter>) => {
  const { error } = await supabase.from('evacuation_centers').update(data).eq('id', id)
  if (error) throw error
}

export const toggleCenterActive = async (id: string, is_active: boolean) => {
  const { error } = await supabase.from('evacuation_centers').update({ is_active }).eq('id', id)
  if (error) throw error
}
