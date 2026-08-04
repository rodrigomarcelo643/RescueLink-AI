export interface EvacuationCenter {
  id: string
  name: string
  barangay: string
  municipality: string
  latitude: number | null
  longitude: number | null
  capacity: number
  current_occupancy: number
  needs: Record<string, boolean> | null
  is_active: boolean
  created_at: string
}
