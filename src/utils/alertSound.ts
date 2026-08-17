import criticalAlertSound from '@/assets/sounds/critical_alert.mp3'

let audioInstance: HTMLAudioElement | null = null

export function playCriticalAlertSound() {
  // Never play sound on public citizen intake / tracking / landing pages
  if (typeof window !== 'undefined') {
    const path = window.location.pathname
    if (
      path.startsWith('/report') ||
      path.startsWith('/track') ||
      path.startsWith('/public') ||
      path === '/' ||
      path === '/login' ||
      path === '/register'
    ) {
      return
    }
  }

  try {
    if (!audioInstance) {
      audioInstance = new Audio(criticalAlertSound)
    }
    audioInstance.currentTime = 0
    audioInstance.play().catch((err) => {
      console.warn('Critical alert sound autoplay prevented or failed:', err)
    })
  } catch (e) {
    console.warn('Error playing critical alert sound:', e)
  }
}
