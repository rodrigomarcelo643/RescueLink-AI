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
  contacts: AgencyContact[]
  email: string | null
  address: string | null
  is_active: boolean
  created_at: string
}
