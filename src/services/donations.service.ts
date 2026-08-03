import { supabase } from './supabase'
import type { Donation } from '@/types/donation'

export const getDonations = async (): Promise<Donation[]> => {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createDonationLink = async (amount: number, description: string) => {
  const { data, error } = await supabase.functions.invoke('process-donation', {
    body: { amount, description },
  })
  if (error) throw error
  return data as { checkoutUrl: string; donationId: string }
}

export const submitInKindDonation = async (items: Record<string, unknown>) => {
  const { error } = await supabase.from('donations').insert({
    type: 'in_kind',
    items,
    status: 'pending',
  })
  if (error) throw error
}

export const addDonation = async (data: {
  type: 'monetary' | 'in_kind'
  amount?: number
  donor_name?: string
  payment_method?: string
  items?: string
  ticket_id?: string
}) => {
  const { error } = await supabase.from('donations').insert({
    type: data.type,
    amount: data.type === 'monetary' ? data.amount : null,
    payment_method: data.payment_method ?? null,
    items: data.items ? { description: data.items } : null,
    status: 'pending',
    currency: 'PHP',
  })
  if (error) throw error
}
