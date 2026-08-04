import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/shared/StatusBadge'
import { ChevronDown, ExternalLink, Package, FileText } from 'lucide-react'
import type { Donation } from '@/types/donation'

export default function DonationRow({ donation }: { donation: Donation }) {
  const [expanded, setExpanded] = useState(false)

  const hasDetails =
    (donation.type === 'in_kind' && donation.items) ||
    donation.payment_reference ||
    donation.receipt_url

  return (
    <>
      <tr
        onClick={() => hasDetails && setExpanded((p) => !p)}
        style={{ borderBottom: expanded ? 'none' : '1px solid #f0f0f0', cursor: hasDetails ? 'pointer' : 'default' }}
        className={hasDetails ? 'transition-colors hover:bg-gray-50/60' : ''}
      >
        <td className="px-4 py-3 text-sm font-medium capitalize text-gray-900">
          <span className="flex items-center gap-1.5">
            {donation.type === 'in_kind' ? <Package size={12} className="text-purple-500" /> : <FileText size={12} className="text-blue-500" />}
            {donation.type.replace('_', ' ')}
          </span>
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
        <td className="px-4 py-3 text-right">
          {hasDetails && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronDown size={13} className="text-gray-400" />
            </motion.span>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      <AnimatePresence initial={false}>
        {expanded && (
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td colSpan={6} className="px-4 pb-4 pt-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div
                  className="flex flex-col gap-3 p-3"
                  style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}
                >
                  {/* In-kind items */}
                  {donation.type === 'in_kind' && donation.items && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Item Details</p>
                      <p className="text-sm text-gray-700">
                        {typeof donation.items === 'string'
                          ? donation.items
                          : JSON.stringify(donation.items, null, 2)}
                      </p>
                    </div>
                  )}

                  {/* Payment reference */}
                  {donation.payment_reference && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Reference No.</p>
                      <p className="font-mono text-sm text-gray-700">{donation.payment_reference}</p>
                    </div>
                  )}

                  {/* Receipt / proof */}
                  {donation.receipt_url && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Proof / Receipt</p>
                      {/\.(jpg|jpeg|png|webp|gif)$/i.test(donation.receipt_url) ? (
                        <a href={donation.receipt_url} target="_blank" rel="noreferrer" className="inline-block">
                          <img
                            src={donation.receipt_url}
                            alt="receipt"
                            className="max-h-40 rounded object-contain transition-opacity hover:opacity-80"
                            style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                          />
                        </a>
                      ) : (
                        <a
                          href={donation.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                        >
                          <ExternalLink size={11} /> View Receipt
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}
