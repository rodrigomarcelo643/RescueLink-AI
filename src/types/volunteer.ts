export interface Volunteer {
  id: string
  profile_id: string
  skills: string[]
  equipment: string[]
  latitude: number | null
  longitude: number | null
  is_available: boolean
  created_at: string
  profiles?: {
    full_name: string
    phone: string
    barangay: string
  }
}
