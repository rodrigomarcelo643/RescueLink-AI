export interface Donation {
  id: string
  donor_id: string | null
  type: 'monetary' | 'in_kind'
  amount: number | null
  currency: string
  items: Record<string, unknown> | null
  payment_method: string | null
  payment_reference: string | null
  status: 'pending' | 'confirmed' | 'distributed'
  allocated_to: string | null
  receipt_url: string | null
  created_at: string
}
