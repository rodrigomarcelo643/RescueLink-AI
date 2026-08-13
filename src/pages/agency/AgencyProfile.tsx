import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Building2, MapPin, Phone, User, Lock, Mail, ShieldCheck, Copy, Check } from 'lucide-react'

export default function AgencyProfile() {
  const { agency } = useAuth()
  const [copied, setCopied] = useState(false)

  if (!agency) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 text-center text-sm text-gray-500">
        No active agency profile found. Please sign in as a response agency.
      </div>
    )
  }

  const handleCopyCredentials = () => {
    const text = `RescueLink Agency Credentials\nAgency: ${agency.name}\nUsername: ${agency.username}\nPassword: ${agency.password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      <div className="flex items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-2xs">
        <div className="size-16 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700 font-bold text-2xl shrink-0">
          <Building2 size={32} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-gray-900">{agency.name}</h1>
            <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase rounded bg-red-700 text-white">
              {agency.category} Unit
            </span>
          </div>
          {agency.category === 'other' && agency.category_other_specify && (
            <p className="text-xs font-bold text-gray-500 italic mt-0.5">
              "{agency.category_other_specify}"
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <MapPin size={13} className="text-red-600" />
            {agency.address || 'Station Physical Address Not Set'}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Station Contact Details */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Phone size={14} className="text-emerald-600" /> Dispatch Hotlines & Contact Numbers
          </h3>

          <div className="flex flex-col gap-2">
            {(agency.contacts ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 italic">No hotline numbers recorded</p>
            ) : (
              agency.contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                  <span className="font-semibold text-gray-500 capitalize">{c.label}:</span>
                  <span className="font-bold text-emerald-700 font-mono">{c.value}</span>
                </div>
              ))
            )}
          </div>

          {agency.email && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-400 font-semibold flex items-center gap-1">
                <Mail size={13} /> Official Email:
              </span>
              <span className="font-bold text-gray-800">{agency.email}</span>
            </div>
          )}
        </div>

        {/* Account Credentials */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-600" /> Portal Login Credentials
            </h3>

            <button
              type="button"
              onClick={handleCopyCredentials}
              className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 hover:text-blue-800"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-3 bg-gray-50 rounded border border-gray-200 flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 flex items-center gap-1">
                <User size={12} /> Username / Login ID
              </span>
              <span className="font-mono font-bold text-gray-900 text-sm">{agency.username || 'N/A'}</span>
            </div>

            <div className="p-3 bg-gray-50 rounded border border-gray-200 flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 flex items-center gap-1">
                <Lock size={12} /> Station Password
              </span>
              <span className="font-mono font-bold text-gray-900 text-sm">{agency.password || '••••••••'}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
