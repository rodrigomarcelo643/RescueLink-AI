export interface Profile {
  id: string
  full_name: string
  role: 'citizen' | 'lgu' | 'ngo' | 'volunteer' | 'admin'
  barangay: string | null
  municipality: string | null
  phone: string | null
  created_at: string
}
