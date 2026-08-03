import { createRoot } from 'react-dom/client'
import Widget from './Widget'
import type { WidgetConfig } from './types'

function mount(config: WidgetConfig) {
  // Create host element
  const host = document.createElement('div')
  host.id = 'rescuelink-widget-host'
  document.body.appendChild(host)

  // Shadow DOM for style isolation
  const shadow = host.attachShadow({ mode: 'open' })

  // Inject Google Font into shadow
  const fontLink = document.createElement('link')
  fontLink.rel = 'stylesheet'
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
  shadow.appendChild(fontLink)

  // Mount point inside shadow
  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)

  createRoot(mountPoint).render(<Widget config={config} />)
}

// Auto-init from script data attributes
function autoInit() {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) return

  const supabaseUrl = script.dataset.supabaseUrl
  const supabaseAnonKey = script.dataset.supabaseAnonKey

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[RescueLink Widget] Missing data-supabase-url or data-supabase-anon-key')
    return
  }

  mount({
    supabaseUrl,
    supabaseAnonKey,
    pageId: script.dataset.pageId,
    title: script.dataset.title,
    subtitle: script.dataset.subtitle,
    primaryColor: script.dataset.primaryColor,
    logoUrl: script.dataset.logoUrl,
  })
}

// Expose global API for manual init
;(window as any).RescueLinkWidget = { init: mount }

// Auto-mount if data attributes present
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}
