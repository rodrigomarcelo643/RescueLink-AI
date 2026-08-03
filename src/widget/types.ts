export interface WidgetMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
}

export interface WidgetConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  pageId?: string
  title?: string
  subtitle?: string
  primaryColor?: string
  logoUrl?: string
}
