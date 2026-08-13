import { useNavigate } from 'react-router-dom'
import { ShieldOff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'
import { getNavForRole } from '@/config/nav'

const ROLE_LABELS: Record<string, string> = {
  lgu: 'LGU Officer',
  ngo: 'NGO Partner',
  volunteer: 'Volunteer',
  citizen: 'Citizen',
  admin: 'Administrator',
}

export default function Unauthorized() {
  const navigate = useNavigate()
  const { role, signOut } = useAuth()
  const { openModal } = useModal()

  const handleSignOut = () => {
    openModal({
      title: 'Sign Out',
      description: 'Are you sure you want to sign out of RescueLink AI?',
      icon: <LogOut size={20} className="text-red-600" />,
      confirmLabel: 'Yes, Sign Out',
      cancelLabel: 'Stay Signed In',
      danger: true,
      onConfirm: async () => {
        await signOut()
        navigate('/login')
      },
    })
  }

  const allowedPages = getNavForRole(role)
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans">
      <div
        className="flex w-full max-w-sm flex-col items-center gap-5 bg-white p-8 text-center"
        style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
      >
        <div className="flex size-12 items-center justify-center" style={{ background: '#fef2f2', borderRadius: 5 }}>
          <ShieldOff size={22} className="text-red-600" />
        </div>

        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-400">
            {roleLabel
              ? `Your account (${roleLabel}) doesn't have permission to view this page.`
              : "You don't have permission to view this page."}
          </p>
        </div>

        {allowedPages.length > 0 && (
          <div className="w-full rounded-md bg-gray-50 px-4 py-3 text-left" style={{ borderRadius: 5 }}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">You have access to</p>
            <div className="flex flex-col gap-1">
              {allowedPages.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <Icon size={13} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          {allowedPages.length > 0 && (
            <Button variant="primary" size="md" fullWidth onClick={() => navigate(allowedPages[0].to)}>
              Go to {allowedPages[0].label}
            </Button>
          )}
          <Button variant="outline" size="md" fullWidth onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
