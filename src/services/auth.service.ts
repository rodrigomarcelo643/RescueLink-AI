import { supabase } from './supabase'

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signInWithFacebook = () =>
  supabase.auth.signInWithOAuth({ provider: 'facebook', options: { skipBrowserRedirect: true } })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const resetPassword = (email: string) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
