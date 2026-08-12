import { supabase } from './supabase'
import type { ResponseAgency } from '@/types/responseAgency'

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
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'agency-cebu-004',
    name: 'Emergency Rescue Unit Foundation (ERUF) - Banawa/Labangon Substation',
    category: 'rescue',
    contacts: [
      { label: 'hotline', value: '161' },
      { label: 'mobile', value: '0917-320-1161' },
      { label: 'landline', value: '(032) 255-7000' },
    ],
    email: 'dispatch@eruf.org.ph',
    address: 'Paseo Arcenas, Banawa-Labangon Boundary, Cebu City (Specialty: Technical Rescue & Trauma EMS)',
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
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export const getResponseAgencies = async (): Promise<ResponseAgency[]> => {
  try {
    const { data, error } = await supabase
      .from('response_agencies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    if (data && data.length > 0) return data
    return CEBU_RESPONSE_AGENCIES_SEED
  } catch (err) {
    console.warn('Using fallback Cebu response agencies seed data:', err)
    return CEBU_RESPONSE_AGENCIES_SEED
  }
}

export const addResponseAgency = async (data: Omit<ResponseAgency, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('response_agencies').insert(data)
  if (error) throw error
}

export const updateResponseAgency = async (id: string, data: Partial<ResponseAgency>) => {
  if (id.startsWith('agency-cebu-')) return
  const { error } = await supabase.from('response_agencies').update(data).eq('id', id)
  if (error) throw error
}

export const deleteResponseAgency = async (id: string) => {
  if (id.startsWith('agency-cebu-')) return
  const { error } = await supabase.from('response_agencies').delete().eq('id', id)
  if (error) throw error
}
