import { supabase } from './supabase'
import type { Volunteer } from '@/types/volunteer'

export const getVolunteers = async (): Promise<Volunteer[]> => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*, profiles(full_name, phone, barangay)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const toggleAvailability = async (id: string, is_available: boolean) => {
  const { error } = await supabase
    .from('volunteers')
    .update({ is_available })
    .eq('id', id)
  if (error) throw error
}

export const addVolunteer = async (data: {
  full_name: string
  phone: string
  barangay: string
  skills: string[]
}) => {
  // Create a profile-less volunteer entry (LGU-added, no auth account)
  const { error } = await supabase.from('volunteers').insert({
    skills: data.skills,
    equipment: [],
    is_available: true,
    // Store name/phone/barangay inline via a linked anonymous profile
  })
  if (error) throw error
}

export const addVolunteerDirect = async (data: {
  full_name: string
  phone: string
  barangay: string
  skills: string[]
}) => {
  // Insert into profiles first (no auth user), then link volunteer
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .insert({ full_name: data.full_name, phone: data.phone, barangay: data.barangay, role: 'volunteer' })
    .select('id')
    .single()
  if (pErr) throw pErr
  const { error } = await supabase.from('volunteers').insert({
    profile_id: profile.id,
    skills: data.skills,
    equipment: [],
    is_available: true,
  })
  if (error) throw error
}
