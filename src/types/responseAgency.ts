export type AgencyCategory =
  | 'fire'
  | 'police'
  | 'medical'
  | 'rescue'
  | 'military'
  | 'ngo'
  | 'other'

export interface AgencyContact {
  label: string  // e.g. 'hotline', 'mobile', 'landline', 'fax'
  value: string
}

export interface ResponseAgency {
  id: string
  name: string
  category: AgencyCategory
  category_other_specify?: string | null
  contacts: AgencyContact[]
  email: string | null
  address: string | null
  is_active: boolean
  username?: string | null
  password?: string | null
  latitude?: number | null
  longitude?: number | null
  equipment_notes?: string | null
  current_assigned_ticket_id?: string | null
  created_at: string
}
