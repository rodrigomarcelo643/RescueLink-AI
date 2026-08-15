import { useState, useEffect } from 'react'
import { Smartphone, Laptop } from 'lucide-react'

export default function PWAInstallWidgetModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPWAInstallPrompt || null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already running in standalone app or widget window mode
    const urlParams = new URLSearchParams(window.location.search)
    const isWidgetMode = urlParams.get('mode') === 'widget'

    const isStandaloneApp =
      isWidgetMode ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: minimal-ui)').matches

    setIsStandalone(isStandaloneApp)

    // Capture browser native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      ;(window as any).deferredPWAInstallPrompt = e
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleDirectInstallOrLaunch = async () => {
    const promptObj = (window as any).deferredPWAInstallPrompt || deferredPrompt

    if (promptObj) {
      try {
        // 🚀 1. Trigger Chrome/Edge/Android Native Installation Dialog!
        await promptObj.prompt()
        const choice = await promptObj.userChoice

        if (choice.outcome === 'accepted') {
          // User clicked Install -> Clear prompt and return
          ;(window as any).deferredPWAInstallPrompt = null
          setDeferredPrompt(null)
          return
        }

        if (choice.outcome === 'dismissed') {
          // 🛑 User clicked Cancel/Dismiss on Native Install Prompt!
          // DO NOT download .url file and DO NOT open popup window.
          return
        }
      } catch (err) {
        console.warn('Native prompt cancelled or unsupported:', err)
      }
    }

    // 🚀 2. If browser does not support native prompt (e.g. Safari), open Standalone Widget Window Mode
    const widgetUrl = `${window.location.origin}/happenings?mode=widget`
    const windowFeatures = 'width=460,height=780,left=150,top=100,resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no'

    const newWindow = window.open(widgetUrl, 'RescueLinkHappeningsWidget', windowFeatures)
    if (newWindow) {
      newWindow.focus()
    }
  }

  if (isStandalone) return null

  return (
    <button
      onClick={handleDirectInstallOrLaunch}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 hover:from-purple-800 hover:to-blue-900 border border-purple-400/40 rounded-xl transition-all shadow-md cursor-pointer shrink-0 animate-pulse"
      title="Click to Install App or Launch Standalone Widget"
    >
      <Laptop size={14} className="text-amber-300 shrink-0 hidden sm:inline" />
      <Smartphone size={14} className="text-amber-300 shrink-0 sm:hidden" />
      <span>Install App / Launch Widget 📲💻</span>
    </button>
  )
}
