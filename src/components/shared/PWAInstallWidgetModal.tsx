import { useState, useEffect } from 'react'
import { Smartphone, Laptop, ExternalLink } from 'lucide-react'

export default function PWAInstallWidgetModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPWAInstallPrompt || null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isAppInstalled, setIsAppInstalled] = useState(false)

  useEffect(() => {
    // 1. Check if running inside standalone app or widget window mode
    const urlParams = new URLSearchParams(window.location.search)
    const isWidgetMode = urlParams.get('mode') === 'widget'

    const isStandaloneApp =
      isWidgetMode ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: minimal-ui)').matches

    setIsStandalone(isStandaloneApp)

    // 2. Check if PWA was previously installed or recorded in localStorage
    const savedInstalled = localStorage.getItem('rescuelink_pwa_installed') === 'true'
    if (savedInstalled) {
      setIsAppInstalled(true)
    }

    // 3. Chromium Native Check for installed PWA
    if ('getInstalledRelatedApps' in navigator) {
      ;(navigator as any)
        .getInstalledRelatedApps()
        .then((apps: any[]) => {
          if (apps && apps.length > 0) {
            setIsAppInstalled(true)
            localStorage.setItem('rescuelink_pwa_installed', 'true')
          } else {
            setIsAppInstalled(false)
            localStorage.removeItem('rescuelink_pwa_installed')
          }
        })
        .catch(() => {})
    }

    // 4. Capture browser native install prompt (Fires ONLY when app is NOT installed)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      ;(window as any).deferredPWAInstallPrompt = e
      setDeferredPrompt(e)
      setIsAppInstalled(false)
      localStorage.removeItem('rescuelink_pwa_installed')
    }

    // 5. Capture appinstalled event when user completes installation
    const handleAppInstalled = () => {
      setIsAppInstalled(true)
      localStorage.setItem('rescuelink_pwa_installed', 'true')
      ;(window as any).deferredPWAInstallPrompt = null
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleOpenApp = () => {
    const appUrl = `${window.location.origin}/near-incident-live-monitoring?mode=widget`
    const windowFeatures = 'width=480,height=800,left=200,top=100,resizable=yes,scrollbars=yes,status=no,location=no'
    const newWindow = window.open(appUrl, 'RescueLinkPWAApp', windowFeatures)
    if (newWindow) {
      newWindow.focus()
    } else {
      window.location.href = appUrl
    }
  }

  const handleDirectInstallOrLaunch = async () => {
    const promptObj = (window as any).deferredPWAInstallPrompt || deferredPrompt

    if (promptObj) {
      try {
        await promptObj.prompt()
        const choice = await promptObj.userChoice

        if (choice.outcome === 'accepted') {
          setIsAppInstalled(true)
          localStorage.setItem('rescuelink_pwa_installed', 'true')
          ;(window as any).deferredPWAInstallPrompt = null
          setDeferredPrompt(null)
          return
        }

        if (choice.outcome === 'dismissed') {
          return
        }
      } catch (err) {
        console.warn('Native prompt cancelled or unsupported:', err)
      }
    }

    // Fallback widget window
    handleOpenApp()
  }

  // If already running inside standalone PWA window, hide button
  if (isStandalone) return null

  // If app is ALREADY INSTALLED, replace "Install" with "Open App 📱"
  if (isAppInstalled) {
    return (
      <button
        onClick={handleOpenApp}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-700 to-green-700 hover:from-emerald-700 hover:to-green-800 border border-emerald-400/40 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
        title="Open Installed RescueLink AI App"
      >
        <Smartphone size={13} className="text-amber-300 shrink-0" />
        <span className="hidden sm:inline">Open RescueLink AI App 🚀</span>
        <span className="sm:hidden font-black">Open App 📱</span>
        <ExternalLink size={11} className="text-emerald-200 hidden sm:inline" />
      </button>
    )
  }

  // If NOT INSTALLED, show "Install App / Launch Widget 📲💻"
  return (
    <button
      onClick={handleDirectInstallOrLaunch}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 hover:from-purple-800 hover:to-blue-900 border border-purple-400/40 rounded-xl transition-all shadow-md cursor-pointer shrink-0 animate-pulse"
      title="Click to Install App or Launch Standalone Widget"
    >
      <Laptop size={13} className="text-amber-300 shrink-0 hidden sm:inline" />
      <Smartphone size={13} className="text-amber-300 shrink-0 sm:hidden" />
      <span className="hidden sm:inline">Install App / Launch Widget 📲💻</span>
      <span className="sm:hidden font-black">Install 📲</span>
    </button>
  )
}
