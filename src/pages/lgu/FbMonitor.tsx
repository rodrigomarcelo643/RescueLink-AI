import FbMonitorPanel from '@/components/incidents/FbMonitorPanel'

export default function FbMonitor() {

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Public Advisories & Facebook Broadcast Sync</h1>
        <p className="mt-0.5 text-sm text-gray-400">AI auto-filled disaster announcements, Facebook Page sync, and citizen post monitoring</p>
      </div>
      <FbMonitorPanel />
    </div>
  )
}
