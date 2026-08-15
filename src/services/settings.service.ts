import { supabase } from './supabase'
import type { Profile } from '@/context/AuthContext'

export interface OrganizationSettings {
  lgu_name: string
  emergency_hotline: string
  office_address: string
  facebook_page_url: string
}

function getStorageKey(userId?: string) {
  return userId ? `rescuelink_lgu_settings_${userId}` : 'rescuelink_lgu_settings_default'
}

export const updateProfile = async (userId: string, data: Partial<Omit<Profile, 'id' | 'role'>>) => {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
  if (error) throw error
}

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export const updateEmail = async (newEmail: string) => {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
}

export const getOrganizationSettings = async (userId?: string): Promise<OrganizationSettings> => {
  const defaultSettings: OrganizationSettings = {
    lgu_name: '',
    emergency_hotline: '',
    office_address: '',
    facebook_page_url: '',
  }

  const key = getStorageKey(userId)

  // 1. Check user-specific localStorage first for instant load
  try {
    const cached = localStorage.getItem(key) || localStorage.getItem('rescuelink_lgu_settings_default')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed) Object.assign(defaultSettings, parsed)
    }
  } catch (e) {
    console.warn('Error reading cached LGU settings:', e)
  }

  // 2. Query Supabase lgu_settings table if user ID available
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('lgu_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data) {
        const fetched: OrganizationSettings = {
          lgu_name: data.lgu_name || defaultSettings.lgu_name,
          emergency_hotline: data.emergency_hotline || defaultSettings.emergency_hotline,
          office_address: data.office_address || defaultSettings.office_address,
          facebook_page_url: data.facebook_page_url || defaultSettings.facebook_page_url,
        }
        localStorage.setItem(key, JSON.stringify(fetched))
        localStorage.setItem('rescuelink_lgu_settings_default', JSON.stringify(fetched))
        return fetched
      }
    } catch (dbErr) {
      console.warn('lgu_settings DB query notice:', dbErr)
    }
  }

  return defaultSettings
}

export const saveOrganizationSettings = async (userId: string, data: OrganizationSettings): Promise<void> => {
  const key = getStorageKey(userId)

  // Always update localStorage first so local state is instantly updated and persisted on reload
  try {
    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem('rescuelink_lgu_settings_default', JSON.stringify(data))
  } catch (e) {
    console.warn('Error caching LGU settings:', e)
  }

  // Persist to Supabase lgu_settings table if available
  if (userId) {
    try {
      const { error } = await supabase.from('lgu_settings').upsert(
        {
          user_id: userId,
          lgu_name: data.lgu_name,
          emergency_hotline: data.emergency_hotline,
          office_address: data.office_address,
          facebook_page_url: data.facebook_page_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.warn('DB upsert notice on lgu_settings:', error.message)
      }
    } catch (err) {
      console.warn('Failed to upsert to lgu_settings DB:', err)
    }
  }
}
