import { getResponseAgencies } from './responseAgencies.service'
import type { ResponseAgency } from '@/types/responseAgency'

const AGENCY_STORAGE_KEY = 'rescuelink_agency_session'

export async function signInAgency(usernameOrEmail: string, passwordAttempt: string): Promise<{ agency: ResponseAgency | null; error: string | null }> {
  try {
    const agencies = await getResponseAgencies()
    const cleanInput = usernameOrEmail.trim().toLowerCase()

    const found = agencies.find((a) => {
      const matchUsername = a.username && a.username.toLowerCase() === cleanInput
      const matchEmail = a.email && a.email.toLowerCase() === cleanInput
      return matchUsername || matchEmail
    })

    if (!found) {
      return { agency: null, error: 'No response agency found with that username or email.' }
    }

    if (found.password && found.password !== passwordAttempt) {
      return { agency: null, error: 'Incorrect password for agency account.' }
    }

    if (found.is_active === false) {
      return { agency: null, error: 'This agency account is currently inactive. Contact your LGU Administrator.' }
    }

    // Save session
    localStorage.setItem(AGENCY_STORAGE_KEY, JSON.stringify(found))
    return { agency: found, error: null }
  } catch (err: unknown) {
    console.error('Agency sign in error:', err)
    return { agency: null, error: err instanceof Error ? err.message : 'Agency sign in failed.' }
  }
}

export function getAgencySession(): ResponseAgency | null {
  try {
    const raw = localStorage.getItem(AGENCY_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ResponseAgency
  } catch {
    return null
  }
}

export function signOutAgency(): void {
  localStorage.removeItem(AGENCY_STORAGE_KEY)
}
  
export function updateAgencySession(updatedAgency: ResponseAgency): void {
  localStorage.setItem(AGENCY_STORAGE_KEY, JSON.stringify(updatedAgency))
}
