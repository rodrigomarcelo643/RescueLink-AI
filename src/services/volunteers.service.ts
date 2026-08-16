import { supabase } from './supabase'
import type { Volunteer } from '@/types/volunteer'

export const getVolunteers = async (): Promise<Volunteer[]> => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*, profiles(full_name, phone, barangay, role, status)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const toggleAvailability = async (id: string, is_available: boolean) => {
  // Update volunteers table by id or profile_id
  const { data: updated, error } = await supabase
    .from('volunteers')
    .update({ is_available })
    .or(`id.eq.${id},profile_id.eq.${id}`)
    .select('id')

  if (error || !updated || updated.length === 0) {
    // Fallback: upsert volunteer row if it doesn't exist yet
    const { error: upErr } = await supabase
      .from('volunteers')
      .upsert({
        profile_id: id,
        is_available,
        skills: ['Medical & First Aid', 'Search & Rescue'],
        equipment: [],
      }, { onConflict: 'profile_id' })

    if (upErr) {
      console.error('toggleAvailability notice:', upErr.message)
      throw upErr
    }
  }
}

export const getVolunteerByUserId = async (userId: string): Promise<Volunteer | null> => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*, profiles(*)')
    .or(`id.eq.${userId},profile_id.eq.${userId}`)
    .maybeSingle()
  if (error) console.warn('getVolunteerByUserId notice:', error.message)
  return data
}

export const updateVolunteerLocation = async (userId: string, latitude: number, longitude: number) => {
  const { error } = await supabase
    .from('volunteers')
    .update({ latitude, longitude })
    .or(`id.eq.${userId},profile_id.eq.${userId}`)

  if (error) console.warn('updateVolunteerLocation notice:', error.message)
}

export const acceptIncidentMission = async (ticketId: string, volunteerId: string, volunteerName: string) => {
  const volunteerAssignedName = `Volunteer Assistance: ${volunteerName}`

  // 1. Update Supabase DB
  const { error } = await supabase
    .from('rescue_tickets')
    .update({
      assigned_agency_name: volunteerAssignedName,
      assigned_agency_id: volunteerId,
      assigned_responder_id: volunteerId,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (error) {
    console.warn('Supabase DB update notice:', error.message)
  }

  // 2. Global cross-tab assistance flag
  try {
    localStorage.setItem(`ticket_assistance_${ticketId}`, JSON.stringify({
      volunteerName,
      volunteerId,
      acceptedAt: new Date().toISOString(),
    }))
  } catch (e) {
    console.warn('localStorage ticket_assistance notice:', e)
  }

  // 3. Instant Broadcast via Web BroadcastChannel & Supabase Realtime
  try {
    const bc = new BroadcastChannel('rescuelink_volunteer_channel')
    bc.postMessage({ type: 'VOLUNTEER_ASSISTED', ticketId, volunteerName, volunteerId })
    bc.close()
  } catch (e) {}

  supabase.channel('public_live_events').send({
    type: 'broadcast',
    event: 'volunteer_assisted',
    payload: { ticketId, volunteerName, volunteerId },
  })

  // 4. Sync to cached_incidents
  try {
    const cached: any[] = JSON.parse(localStorage.getItem('cached_incidents') || '[]')
    const idx = cached.findIndex((item) => item.id === ticketId)
    if (idx !== -1) {
      cached[idx].assigned_agency_name = volunteerAssignedName
      cached[idx].assigned_agency_id = volunteerId
      cached[idx].assigned_responder_id = volunteerId
      cached[idx].accepted_at = new Date().toISOString()
      localStorage.setItem('cached_incidents', JSON.stringify(cached))
    }
  } catch (e) {
    console.warn('localStorage sync notice:', e)
  }
}

export const cancelIncidentMission = async (ticketId: string) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({
      assigned_agency_name: null,
      assigned_agency_id: null,
      assigned_responder_id: null,
      accepted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (error) {
    console.warn('Supabase DB cancel notice:', error.message)
  }

  try {
    localStorage.removeItem(`ticket_assistance_${ticketId}`)
  } catch (e) {
    console.warn('localStorage remove notice:', e)
  }

  try {
    const bc = new BroadcastChannel('rescuelink_volunteer_channel')
    bc.postMessage({ type: 'VOLUNTEER_CANCELLED', ticketId })
    bc.close()
  } catch (e) {}

  supabase.channel('public_live_events').send({
    type: 'broadcast',
    event: 'volunteer_cancelled',
    payload: { ticketId },
  })

  try {
    const cached: any[] = JSON.parse(localStorage.getItem('cached_incidents') || '[]')
    const idx = cached.findIndex((item) => item.id === ticketId)
    if (idx !== -1) {
      cached[idx].assigned_agency_name = null
      cached[idx].assigned_agency_id = null
      cached[idx].assigned_responder_id = null
      cached[idx].accepted_at = null
      localStorage.setItem('cached_incidents', JSON.stringify(cached))
    }
  } catch (e) {
    console.warn('localStorage cancel notice:', e)
  }
}

export const toggleAccountStatus = async (id: string, profileId: string | undefined, newStatus: 'active' | 'deactivated') => {
  const { error: vErr } = await supabase
    .from('volunteers')
    .update({ account_status: newStatus })
    .eq('id', id)

  if (vErr) {
    console.warn('volunteers account_status update notice:', vErr.message)
  }

  if (profileId) {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', profileId)

    if (pErr) console.warn('profiles status update notice:', pErr.message)
  }
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
  equipment?: string[]
  latitude?: number | null
  longitude?: number | null
}) => {
  // Insert into profiles first (no auth user), then link volunteer
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .insert({ full_name: data.full_name, phone: data.phone, barangay: data.barangay, role: 'volunteer', status: 'active' })
    .select('id')
    .single()
  if (pErr) throw pErr
  const { error } = await supabase.from('volunteers').insert({
    profile_id: profile.id,
    skills: data.skills,
    equipment: data.equipment || [],
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    is_available: false, // Default inactive deployment status
  })
  if (error) throw error
}

export const registerVolunteerAccount = async (data: {
  email: string
  password: string
  full_name: string
  phone: string
  barangay: string
  skills: string[]
  equipment: string[]
  latitude: number | null
  longitude: number | null
}) => {
  // 1. Create Supabase Auth User
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        role: 'volunteer',
        phone: data.phone,
        barangay: data.barangay,
      },
    },
  })

  if (authErr) throw authErr
  const userId = authData.user?.id

  // 2. Ensure profile exists in profiles table
  let profileId: string | null = userId || null

  if (userId) {
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: data.full_name,
        phone: data.phone,
        barangay: data.barangay,
        role: 'volunteer',
        status: 'active',
      })

    if (profErr) {
      console.warn('profiles upsert notice:', profErr.message)
    }
  }

  // Fallback: if no userId returned yet or upsert failed, insert profile row
  if (!profileId) {
    const { data: pData, error: pErr } = await supabase
      .from('profiles')
      .insert({
        full_name: data.full_name,
        phone: data.phone,
        barangay: data.barangay,
        role: 'volunteer',
        status: 'active',
      })
      .select('id')
      .single()

    if (!pErr && pData) {
      profileId = pData.id
    }
  }

  // 3. Insert into volunteers table
  const { error: volErr } = await supabase.from('volunteers').insert({
    profile_id: profileId,
    skills: data.skills || [],
    equipment: data.equipment || [],
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    is_available: false,
    account_status: 'active',
  })

  if (volErr) {
    console.error('volunteers insert error:', volErr.message)
    throw new Error(`Failed to save volunteer row: ${volErr.message}. Please disable RLS or enable public INSERT on 'volunteers' table in Supabase.`)
  }

  return authData
}

export const updateVolunteer = async (
  id: string,
  profileId: string | undefined,
  data: {
    full_name: string
    phone: string
    barangay: string
    skills: string[]
    equipment: string[]
    is_available: boolean
  }
) => {
  const { error: vErr } = await supabase
    .from('volunteers')
    .update({
      skills: data.skills,
      equipment: data.equipment,
      is_available: data.is_available,
    })
    .eq('id', id)

  if (vErr) throw vErr

  if (profileId) {
    await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone,
        barangay: data.barangay,
      })
      .eq('id', profileId)
  }
}

export const deleteVolunteer = async (id: string, _profileId?: string) => {
  const { error } = await supabase.from('volunteers').delete().eq('id', id)
  if (error) throw error
}
