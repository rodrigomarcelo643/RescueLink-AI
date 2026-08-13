import FbMonitorPanel from '@/components/incidents/FbMonitorPanel'

export default function FbMonitor() {

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Facebook Monitoring</h1>
        <p className="mt-0.5 text-sm text-gray-400">AI-flagged posts, incident tickets, and Messenger threads</p>
      </div>
      <FbMonitorPanel />
    </div>
  )
}
