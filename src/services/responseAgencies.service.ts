import { supabase } from './supabase'
import type { ResponseAgency, AgencyCategory, AgencyContact } from '@/types/responseAgency'

export const CEBU_RESPONSE_AGENCIES_SEED: ResponseAgency[] = [
  {
    id: 'agency-cebu-001',
    name: 'BFP Labangon Fire Sub-Station',
    category: 'fire',
    contacts: [
      { label: 'hotline', value: '(032) 261-2222' },
      { label: 'mobile', value: '0917-237-3347' },
    ],
    email: 'bfp.labangon@cebucity.gov.ph',
    address: 'Katipunan St, Barangay Labangon, Cebu City (Specialty: Fire & Suppression)',
    username: 'bfp_labangon',
    password: 'Password@2026',
    latitude: 10.3015,
    longitude: 123.8821,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-002',
    name: 'BFP Cebu City Central Fire Station',
    category: 'fire',
    contacts: [
      { label: 'hotline', value: '160' },
      { label: 'landline', value: '(032) 256-0577' },
    ],
    email: 'bfp.cebucity.main@cebucity.gov.ph',
    address: 'N. Bacalso Ave, Cebu City (Specialty: Major Fire & Hazmat)',
    username: 'bfp_cebu_central',
    password: 'Password@2026',
    latitude: 10.2985,
    longitude: 123.8965,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-003',
    name: 'CCDRRMO Landslide & Heavy Equipment Response Unit',
    category: 'rescue',
    contacts: [
      { label: 'hotline', value: '(032) 262-1424' },
      { label: 'mobile', value: '0932-843-2273' },
    ],
    email: 'ccdrrmo.landslide@cebucity.gov.ph',
    address: 'Cebu City DRRMO Operational Center, Labangon/Banawa Sector (Specialty: Landslide & Slope Soil Failure)',
    username: 'ccdrrmo_rescue',
    password: 'Password@2026',
    latitude: 10.3102,
    longitude: 123.8790,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-004',
    name: 'Emergency Rescue Unit Foundation (ERUF) - Ambulance & Trauma Response',
    category: 'medical',
    contacts: [
      { label: 'hotline', value: '161' },
      { label: 'mobile', value: '0917-320-1161' },
      { label: 'landline', value: '(032) 255-7000' },
    ],
    email: 'dispatch@eruf.org.ph',
    address: 'Paseo Arcenas, Banawa-Labangon Boundary, Cebu City (Specialty: Ambulance, Paramedics & Trauma EMS)',
    username: 'eruf_dispatch',
    password: 'Password@2026',
    latitude: 10.3125,
    longitude: 123.8785,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-005',
    name: 'Philippine Red Cross - Cebu Chapter Emergency Medical Unit',
    category: 'medical',
    contacts: [
      { label: 'hotline', value: '143' },
      { label: 'landline', value: '(032) 253-9793' },
      { label: 'mobile', value: '0917-838-8143' },
    ],
    email: 'cebu@redcross.org.ph',
    address: 'Osmeña Blvd, Cebu City (Specialty: Medical Emergencies, Trauma & Ambulances)',
    username: 'redcross_cebu',
    password: 'Password@2026',
    latitude: 10.3090,
    longitude: 123.8912,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-006',
    name: 'Cebu City Police Station 10 - Labangon (PNP)',
    category: 'police',
    contacts: [
      { label: 'hotline', value: '911' },
      { label: 'landline', value: '(032) 261-9772' },
      { label: 'mobile', value: '0998-598-6385' },
    ],
    email: 'police.labangon@pnp.gov.ph',
    address: 'Katipunan St, Barangay Labangon, Cebu City (Specialty: Security, Police & Crowd Control)',
    username: 'pnp_station10',
    password: 'Password@2026',
    latitude: 10.3018,
    longitude: 123.8825,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-007',
    name: 'Philippine Coast Guard & CCDRRMO Flood Rescue Division',
    category: 'military',
    contacts: [
      { label: 'hotline', value: '(032) 402-0489' },
      { label: 'mobile', value: '0917-842-5060' },
    ],
    email: 'pcg.cgdncv@coastguard.gov.ph',
    address: 'Arellano Blvd, Pier 3, Cebu City (Specialty: Flood Waters, River Overflow & Maritime Rescue)',
    username: 'coastguard_flood',
    password: 'Password@2026',
    latitude: 10.2940,
    longitude: 123.9080,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export const getResponseAgencies = async (): Promise<ResponseAgency[]> => {
  const localSaved: ResponseAgency[] = JSON.parse(localStorage.getItem('registered_agencies') || '[]')
  const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_agency_ids') || '[]')

  let dbData: ResponseAgency[] = []
  try {
    const { data, error } = await supabase
      .from('response_agencies')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      dbData = data
    }
  } catch (err) {
    console.warn('DB fetch notice:', err)
  }

  // Always merge localSaved, DB records, and seed accounts so Incognito/fresh sessions can log in reliably!
  const combined = [...localSaved, ...dbData, ...CEBU_RESPONSE_AGENCIES_SEED]
  const uniqueMap = new Map<string, ResponseAgency>()
  combined.forEach((item) => {
    const key = (item.username || item.id || '').toLowerCase()
    if (key && !uniqueMap.has(key) && !deletedIds.includes(item.id)) {
      uniqueMap.set(key, item)
    }
  })
  return Array.from(uniqueMap.values())
}

export interface AgencyRegistrationPayload {
  name: string
  category: AgencyCategory
  category_other_specify?: string | null
  contacts: AgencyContact[]
  email?: string | null
  address?: string | null
  username: string
  password: string
  latitude?: number | null
  longitude?: number | null
  equipment_notes?: string | null
}

export const registerAgencyAccount = async (payload: AgencyRegistrationPayload): Promise<ResponseAgency> => {
  const newAgency = {
    name: payload.name,
    category: payload.category,
    category_other_specify: payload.category_other_specify || null,
    contacts: payload.contacts,
    email: payload.email || null,
    address: payload.address || null,
    username: payload.username.trim(),
    password: payload.password,
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    equipment_notes: payload.equipment_notes || null,
    is_active: true,
  }

  // 1) Primary dynamic database insert attempt into Supabase response_agencies table
  try {
    const { data, error } = await supabase
      .from('response_agencies')
      .insert(newAgency)
      .select('*')
      .single()

    if (!error && data) {
      const existing: ResponseAgency[] = JSON.parse(localStorage.getItem('registered_agencies') || '[]')
      const filteredExisting = existing.filter(a => a.username?.toLowerCase() !== newAgency.username.toLowerCase())
      localStorage.setItem('registered_agencies', JSON.stringify([data, ...filteredExisting]))
      return data
    }

    if (error) {
      console.warn('Full Supabase insert error on response_agencies:', error.message)
      // Attempt core payload insert in case extended fields are not present in DB schema
      const coreAgency = {
        name: payload.name,
        category: payload.category,
        contacts: payload.contacts,
        email: payload.email || null,
        address: payload.address || null,
        username: payload.username.trim(),
        password: payload.password,
        is_active: true,
      }
      const { data: coreData, error: coreError } = await supabase
        .from('response_agencies')
        .insert(coreAgency)
        .select('*')
        .single()

      if (!coreError && coreData) {
        const existing: ResponseAgency[] = JSON.parse(localStorage.getItem('registered_agencies') || '[]')
        const filteredExisting = existing.filter(a => a.username?.toLowerCase() !== newAgency.username.toLowerCase())
        localStorage.setItem('registered_agencies', JSON.stringify([coreData, ...filteredExisting]))
        return coreData
      }
    }
  } catch (err) {
    console.warn('Database insert attempt notice:', err)
  }

  // 2) Fallback to local storage persistence for offline or restricted RLS
  const localAgency: ResponseAgency = {
    id: `agency-reg-${Date.now()}`,
    ...newAgency,
    created_at: new Date().toISOString(),
  }

  const existing: ResponseAgency[] = JSON.parse(localStorage.getItem('registered_agencies') || '[]')
  const filteredExisting = existing.filter(a => a.username?.toLowerCase() !== newAgency.username.toLowerCase())
  localStorage.setItem('registered_agencies', JSON.stringify([localAgency, ...filteredExisting]))

  return localAgency
}

export const updateAgencyStatus = async (
  id: string,
  status: 'available' | 'busy' | 'offline'
): Promise<ResponseAgency | null> => {
  const patch = {
    operational_status: status,
    is_active: status !== 'offline',
  }

  // Try DB update first (works for registered agencies in Supabase)
  try {
    const { data, error } = await supabase
      .from('response_agencies')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (!error && data) return data as ResponseAgency
    // DB update failed (seed agency or column missing) — fall through to session-only update
    console.warn('DB status update skipped (seed agency or missing column):', error?.message)
  } catch (e) {
    console.warn('DB status update error:', e)
  }

  // Fallback: return null so caller can still update session from local state
  return null
}

export const addResponseAgency = async (data: Omit<ResponseAgency, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('response_agencies').insert(data)
  if (error) throw error
}

export const updateResponseAgency = async (id: string, patch: Partial<ResponseAgency>) => {
  // Update in local registered agencies cache
  const localSaved: ResponseAgency[] = JSON.parse(localStorage.getItem('registered_agencies') || '[]')
  const updatedLocal = localSaved.map((item) => (item.id === id ? { ...item, ...patch } : item))
  localStorage.setItem('registered_agencies', JSON.stringify(updatedLocal))

  try {
    const { error } = await supabase.from('response_agencies').update(patch).eq('id', id)
    if (error) console.warn('Supabase DB update notice:', error)
  } catch (e) {
    console.warn('DB update error notice:', e)
  }
}

export const deleteResponseAgency = async (id: string) => {
  // 1) Remove from local registered agencies store
  const localSaved: ResponseAgency[] = JSON.parse(localStorage.getItem('registered_agencies') || '[]')
  const filteredLocal = localSaved.filter((item) => item.id !== id)
  localStorage.setItem('registered_agencies', JSON.stringify(filteredLocal))

  // 2) Track deleted agency ID to suppress seed data or cached DB items
  const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_agency_ids') || '[]')
  if (!deletedIds.includes(id)) {
    localStorage.setItem('deleted_agency_ids', JSON.stringify([...deletedIds, id]))
  }

  // 3) Delete from Supabase DB table
  try {
    const { error } = await supabase.from('response_agencies').delete().eq('id', id)
    if (error) console.warn('Supabase DB delete notice:', error)
  } catch (e) {
    console.warn('DB delete error notice:', e)
  }
}
