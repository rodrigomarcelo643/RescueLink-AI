import criticalAlertSound from '@/assets/sounds/critical_alert.mp3'

let audioInstance: HTMLAudioElement | null = null

export function playCriticalAlertSound() {
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
