import { supabase } from './supabase'
import type { ResponseAgency } from '@/types/responseAgency'

export const getResponseAgencies = async (): Promise<ResponseAgency[]> => {
  const { data, error } = await supabase
    .from('response_agencies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const addResponseAgency = async (data: Omit<ResponseAgency, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('response_agencies').insert(data)
  if (error) throw error
}

export const updateResponseAgency = async (id: string, data: Partial<ResponseAgency>) => {
  const { error } = await supabase.from('response_agencies').update(data).eq('id', id)
  if (error) throw error
}

export const deleteResponseAgency = async (id: string) => {
  const { error } = await supabase.from('response_agencies').delete().eq('id', id)
  if (error) throw error
}
