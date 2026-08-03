import { supabase } from './supabase'
import type { Profile } from '@/context/AuthContext'

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
