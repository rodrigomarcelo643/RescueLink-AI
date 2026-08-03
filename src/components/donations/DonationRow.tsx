import StatusBadge from '@/components/shared/StatusBadge'
import type { Donation } from '@/types/donation'

export default function DonationRow({ donation }: { donation: Donation }) {
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td className="px-4 py-3 text-sm font-medium capitalize text-gray-900">
        {donation.type.replace('_', ' ')}
      </td>
      <td className="px-4 py-3 text-sm font-extrabold text-gray-900">
        {donation.type === 'monetary' ? `₱${donation.amount?.toLocaleString()}` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {donation.payment_method ?? 'In-Kind'}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={donation.status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(donation.created_at).toLocaleDateString()}
      </td>
    </tr>
  )
}
