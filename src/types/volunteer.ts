export interface Volunteer {
  id: string
  profile_id: string
  skills: string[]
  equipment: string[]
  latitude: number | null
  longitude: number | null
  is_available: boolean
  account_status?: 'active' | 'deactivated'
  created_at: string
  profiles?: {
    full_name: string
    phone: string
    barangay: string
    email?: string
    role?: string
    status?: 'active' | 'deactivated'
  }
}
