import { supabase } from '@/services/supabase'

export async function queryOne<T>(
  table: string,
  id: string
): Promise<T> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
  if (error) throw error
  return data as T
}

export async function queryAll<T>(
  table: string,
  options?: { column?: string; value?: unknown; ascending?: boolean }
): Promise<T[]> {
  let query = supabase.from(table).select('*')
  if (options?.column && options.value !== undefined) {
    query = query.eq(options.column, options.value)
  }
  const { data, error } = await query.order('created_at', { ascending: options?.ascending ?? false })
  if (error) throw error
  return data as T[]
}
