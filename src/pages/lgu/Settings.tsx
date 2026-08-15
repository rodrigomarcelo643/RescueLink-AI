import { useState, useEffect } from 'react'
import { User, Lock, Bell, Building2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { updateProfile, updatePassword, updateEmail, getOrganizationSettings, saveOrganizationSettings } from '@/services/settings.service'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Tab = 'profile' | 'security' | 'notifications' | 'organization'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',      label: 'Profile',       icon: User      },
  { id: 'security',     label: 'Security',      icon: Lock      },
  { id: 'notifications',label: 'Notifications', icon: Bell      },
  { id: 'organization', label: 'Organization',  icon: Building2 },
]

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
        {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Toast({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5"
      style={{
        background: type === 'success' ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 5,
      }}
    >
      {type === 'success'
        ? <CheckCircle size={13} className="shrink-0 text-green-600" />
        : <AlertTriangle size={13} className="shrink-0 text-red-600" />}
      <p className={`text-[12px] font-semibold ${type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{message}</p>
    </div>
  )
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [barangay, setBarangay] = useState(profile?.barangay ?? '')
  const [municipality, setMunicipality] = useState(profile?.municipality ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    setFeedback(null)
    try {
      await updateProfile(user.id, { full_name: fullName, phone, barangay, municipality })
      if (email !== user.email) await updateEmail(email)
      await refreshProfile()
      setFeedback({ type: 'success', message: 'Profile updated successfully.' })
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message ?? 'Failed to update profile.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Personal Information" description="Update your name and contact details.">
        <div className="flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center text-xl font-extrabold text-white"
              style={{ background: '#b91c1c', borderRadius: 8 }}
            >
              {(profile?.full_name ?? user?.email ?? 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900">{profile?.full_name ?? 'No name set'}</p>
              <p className="text-xs capitalize text-gray-400">{profile?.role} · {profile?.municipality ?? 'No municipality'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan dela Cruz" />
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lgu.gov.ph" />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
            <Input label="Barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)} placeholder="Barangay Poblacion" />
            <Input label="Municipality / City" value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Quezon City" className="sm:col-span-2" />
          </div>

          {feedback && <Toast type={feedback.type} message={feedback.message} />}

          <div className="flex justify-end">
            <Button variant="primary" size="md" loading={loading} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleChange = async () => {
    if (newPass !== confirm) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (newPass.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }
    setLoading(true)
    setFeedback(null)
    try {
      await updatePassword(newPass)
      setFeedback({ type: 'success', message: 'Password changed successfully.' })
      setCurrent(''); setNewPass(''); setConfirm('')
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message ?? 'Failed to change password.' })
    } finally {
      setLoading(false)
    }
  }

  const strength = newPass.length === 0 ? 0 : newPass.length < 8 ? 1 : newPass.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e']

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Change Password" description="Use a strong password you don't use elsewhere.">
        <div className="flex flex-col gap-4">
          <Input
            label="Current Password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            icon={<Lock size={14} />}
          />
          <Input
            label="New Password"
            type={showNew ? 'text' : 'password'}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="••••••••"
            icon={<Lock size={14} />}
            endAdornment={
              <button type="button" onClick={() => setShowNew(v => !v)} className="transition-colors hover:text-gray-500">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {/* Strength bar */}
          {newPass.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i <= strength ? strengthColor[strength] : '#e5e7eb' }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]}
              </p>
            </div>
          )}

          <Input
            label="Confirm New Password"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            icon={<Lock size={14} />}
            endAdornment={
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="transition-colors hover:text-gray-500">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {feedback && <Toast type={feedback.type} message={feedback.message} />}

          <div className="flex justify-end">
            <Button variant="primary" size="md" loading={loading} onClick={handleChange} disabled={!current || !newPass || !confirm}>
              Update Password
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Active Sessions" description="Devices currently signed in to your account.">
        <div className="flex items-center justify-between rounded py-2">
          <div>
            <p className="text-xs font-semibold text-gray-900">Current session</p>
            <p className="text-[11px] text-gray-400">This browser · Active now</p>
          </div>
          <span
            className="px-2 py-0.5 text-[10px] font-extrabold"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4 }}
          >
            Active
          </span>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    new_incident: true,
    incident_update: true,
    new_donation: false,
    volunteer_update: false,
    fb_flagged: true,
    daily_summary: true,
  })

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const items = [
    { key: 'new_incident',    label: 'New Incident Reported',     desc: 'When a new rescue ticket is created' },
    { key: 'incident_update', label: 'Incident Status Update',    desc: 'When a ticket status changes' },
    { key: 'new_donation',    label: 'New Donation Received',     desc: 'When a confirmed donation comes in' },
    { key: 'volunteer_update',label: 'Volunteer Availability',    desc: 'When a volunteer toggles availability' },
    { key: 'fb_flagged',      label: 'Facebook AI Flag',          desc: 'When a post is flagged by AI monitoring' },
    { key: 'daily_summary',   label: 'Daily Summary Report',      desc: 'End-of-day operations summary' },
  ] as const

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Notification Preferences" description="Choose what you want to be notified about.">
        <div className="flex flex-col divide-y divide-gray-50">
          {items.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-xs font-semibold text-gray-900">{label}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                className="relative shrink-0 transition-colors"
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: prefs[key] ? '#b91c1c' : '#e5e7eb',
                }}
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
                  style={{ left: prefs[key] ? 18 : 2 }}
                />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Organization Tab ─────────────────────────────────────────────────────────
function OrganizationTab() {
  const { user, profile } = useAuth()
  const [lguName, setLguName] = useState('')
  const [hotline, setHotline] = useState('')
  const [address, setAddress] = useState('')
  const [fbPage, setFbPage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    let active = true
    const loadSettings = async () => {
      const settings = await getOrganizationSettings(user?.id)
      if (active) {
        setLguName(settings.lgu_name || (profile?.municipality ? 'LGU ' + profile.municipality : 'LGU Command Center'))
        setHotline(settings.emergency_hotline || '')
        setAddress(settings.office_address || '')
        setFbPage(settings.facebook_page_url || '')
        setFetching(false)
      }
    }
    loadSettings()
    return () => { active = false }
  }, [user?.id, profile?.municipality])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    setFeedback(null)
    try {
      await saveOrganizationSettings(user.id, {
        lgu_name: lguName,
        emergency_hotline: hotline,
        office_address: address,
        facebook_page_url: fbPage,
      })
      setFeedback({ type: 'success', message: 'LGU organization settings saved and updated successfully.' })
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message ?? 'Failed to save organization settings.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="LGU Information" description="Details shown on public-facing pages and advisories.">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="LGU / Office Name" value={lguName} onChange={(e) => setLguName(e.target.value)} placeholder="LGU Quezon City" disabled={fetching} />
            <Input label="Emergency Hotline" value={hotline} onChange={(e) => setHotline(e.target.value)} placeholder="+63 2 XXXX XXXX" disabled={fetching} />
            <Input label="Office Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City Hall, Quezon City" className="sm:col-span-2" disabled={fetching} />
          </div>

          {feedback && <Toast type={feedback.type} message={feedback.message} />}

          <div className="flex justify-end">
            <Button variant="primary" size="md" loading={loading} onClick={handleSave} disabled={fetching}>
              Save Organization Info
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Facebook Integration" description="Connect your Facebook Page for Messenger and post monitoring.">
        <div className="flex flex-col gap-4">
          <Input
            label="Facebook Page URL"
            value={fbPage}
            onChange={(e) => setFbPage(e.target.value)}
            placeholder="https://facebook.com/your-lgu-page"
            disabled={fetching}
          />
          <div
            className="flex items-start gap-3 rounded px-4 py-3"
            style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5 }}
          >
            <AlertTriangle size={14} className="mt-px shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Webhook configuration required</p>
              <p className="mt-0.5 text-[11px] text-amber-600">
                To enable Messenger and post monitoring, configure your Facebook App webhook to point to your Supabase Edge Function URL. See the setup docs for details.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="md" loading={loading} onClick={handleSave} disabled={fetching}>
              Save Facebook URL
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState<Tab>('profile')

  const TAB_CONTENT = {
    profile:       <ProfileTab />,
    security:      <SecurityTab />,
    notifications: <NotificationsTab />,
    organization:  <OrganizationTab />,
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-400">Manage your account and LGU preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 0 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              borderBottom: tab === id ? '2px solid #b91c1c' : '2px solid transparent',
              color: tab === id ? '#b91c1c' : '#6b7280',
              background: 'transparent',
              marginBottom: -1,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{TAB_CONTENT[tab]}</div>
    </div>
  )
}
