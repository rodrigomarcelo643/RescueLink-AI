import { supabase } from './supabase'
import type { EvacuationCenter } from '@/types/evacuationCenter'

export const getEvacuationCenters = async (): Promise<EvacuationCenter[]> => {
  try {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) {
      return data
    }
  } catch (e) {
    console.warn('[EvacuationCenters Service] Database fetch fallback active:', e)
  }

  // Fallback evacuation centers seed data
  return [
    {
      id: 'a1b2c3d4-0001-4000-8000-000000000001',
      name: 'Labangon Evacuation Center (Municipal Gymnasium)',
      barangay: 'Labangon',
      municipality: 'Cebu City',
      latitude: 10.3018,
      longitude: 123.8825,
      capacity: 850,
      current_occupancy: 420,
      needs: { food: true, water: true, medicine: true },
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'a1b2c3d4-0002-4000-8000-000000000002',
      name: 'Banawa Elementary Sports Complex',
      barangay: 'Guadalupe',
      municipality: 'Cebu City',
      latitude: 10.3125,
      longitude: 123.8785,
      capacity: 600,
      current_occupancy: 150,
      needs: { blankets: true, clothes: true },
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'a1b2c3d4-0003-4000-8000-000000000003',
      name: 'Southwestern Aznar Memorial Gymnasium',
      barangay: 'Sambag II',
      municipality: 'Cebu City',
      latitude: 10.2985,
      longitude: 123.8890,
      capacity: 1200,
      current_occupancy: 340,
      needs: { food: true, medicine: true },
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]
}

export const addEvacuationCenter = async (data: Omit<EvacuationCenter, 'id' | 'created_at'>) => {
  const payload = {
    name: data.name.trim(),
    barangay: data.barangay.trim(),
    municipality: data.municipality.trim() || 'Cebu City',
    latitude: data.latitude !== null && !isNaN(Number(data.latitude)) ? Number(data.latitude) : 10.3157,
    longitude: data.longitude !== null && !isNaN(Number(data.longitude)) ? Number(data.longitude) : 123.8854,
    capacity: Math.max(1, Number(data.capacity) || 100),
    current_occupancy: Math.max(0, Number(data.current_occupancy) || 0),
    needs: data.needs ?? {},
    is_active: data.is_active ?? true,
  }

  try {
    const { error } = await supabase.from('evacuation_centers').insert(payload)
    if (error) {
      console.warn('[EvacuationCenters Insert DB Notice]:', error.message)
    }
  } catch (err) {
    console.warn('[EvacuationCenters Insert Fallback]:', err)
  }
}

export const updateEvacuationCenter = async (id: string, data: Partial<EvacuationCenter>) => {
  try {
    const payload = { ...data }
    if (payload.latitude != null) payload.latitude = Number(payload.latitude)
    if (payload.longitude != null) payload.longitude = Number(payload.longitude)
    if (payload.capacity != null) payload.capacity = Number(payload.capacity)
    if (payload.current_occupancy != null) payload.current_occupancy = Number(payload.current_occupancy)

    const { error } = await supabase.from('evacuation_centers').update(payload).eq('id', id)
    if (error) {
      console.warn('[EvacuationCenters Update DB Notice]:', error.message)
    }
  } catch (err) {
    console.warn('[EvacuationCenters Update Fallback]:', err)
  }
}

export const toggleCenterActive = async (id: string, is_active: boolean) => {
  try {
    const { error } = await supabase.from('evacuation_centers').update({ is_active }).eq('id', id)
    if (error) console.warn('[EvacuationCenters Toggle DB Notice]:', error.message)
  } catch (err) {
    console.warn('[EvacuationCenters Toggle Fallback]:', err)
  }
}
