import { useState, useEffect } from 'react'
import {
  ExternalLink, AlertTriangle, CheckCircle, Clock, Flag, MessageCircle,
  Sparkles, Send, Radio, Megaphone, Share2, CheckCircle2, RefreshCw,
  Layers, Zap, X, Plus, Volume2, Image as ImageIcon
} from 'lucide-react'
import { useFacebookPosts } from '@/hooks/useFacebookPosts'
import { useMessengerTickets } from '@/hooks/useMessengerTickets'
import { convertFbPostToTicket } from '@/services/facebook.service'
import { getIncidents } from '@/services/incidents.service'
import {
  getFbPostsTracking,
  createAndPublishAdvisory,
  generateAIPatternSuggestions,
  type FbPostTrackingRecord,
  type AIPatternSuggestion
} from '@/services/advisories.service'
import { useModal } from '@/context/ModalContext'
import type { MessengerConversation } from '@/hooks/useMessengerTickets'
import type { Incident } from '@/types/incident'
import MessengerThread from './MessengerThread'
import type { FbPost } from '@/types/fbPost'
import Pagination from '@/components/shared/Pagination'

const PER_PAGE = 10

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#b91c1c',
}

const SEVERITY_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  low:      { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  medium:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  high:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  critical: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return 'just now'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ConversationCard({ convo }: { convo: MessengerConversation }) {
  return (
    <div className="flex flex-col gap-1.5 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-full" style={{ background: '#1877f2' }}>
          <MessageCircle size={11} color="white" />
        </div>
        <span className="text-[12px] font-extrabold text-gray-900">Messenger User</span>
        <span className="text-[11px] text-gray-400">{timeAgo(convo.last_at)}</span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-1">
        {convo.last_sender_type === 'lgu' ? <span className="text-gray-400">You: </span> : null}
        {convo.last_message}
      </p>
      <MessengerThread fbSenderId={convo.sender_id} senderName="Citizen" />
    </div>
  )
}

export default function FbMonitorPanel() {
  const { posts, loading: postsLoading } = useFacebookPosts()
  const { conversations, loading: ticketsLoading } = useMessengerTickets()
  const { openModal } = useModal()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [trackedPosts, setTrackedPosts] = useState<FbPostTrackingRecord[]>([])
  const [suggestions, setSuggestions] = useState<AIPatternSuggestion[]>([])
  const [loadingTracking, setLoadingTracking] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Flash Flood')
  const [severity, setSeverity] = useState('high')
  const [body, setBody] = useState('')
  const [patternReason, setPatternReason] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)

  const [converting, setConverting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'fb_sync' | 'all' | 'flagged' | 'converted' | 'messenger'>('fb_sync')
  const [page, setPage] = useState(1)
  const [dmPage, setDmPage] = useState(1)

  const loading = postsLoading || ticketsLoading

  useEffect(() => {
    loadTrackingData()
  }, [])

  const loadTrackingData = async () => {
    setLoadingTracking(true)
    try {
      const incList = await getIncidents()
      setIncidents(incList)

      const aiSugg = generateAIPatternSuggestions(incList)
      setSuggestions(aiSugg)

      if (aiSugg.length > 0 && !title) {
        setTitle(aiSugg[0].title)
        setCategory(aiSugg[0].category)
        setSeverity(aiSugg[0].severity)
        setBody(aiSugg[0].body)
        setPatternReason(aiSugg[0].patternReason)
      }

      const tracked = await getFbPostsTracking()
      setTrackedPosts(tracked)
    } finally {
      setLoadingTracking(false)
    }
  }

  const [availableProofMedia, setAvailableProofMedia] = useState<string[]>([])
  const [selectedProofMedia, setSelectedProofMedia] = useState<string[]>([])

  const toggleProofMedia = (url: string) => {
    setSelectedProofMedia((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    )
  }

  // Adopt AI Recommended Pattern Suggestion & Open Modal
  const handleAdoptSuggestion = (sugg: AIPatternSuggestion) => {
    setTitle(sugg.title)
    setCategory(sugg.category)
    setSeverity(sugg.severity)
    setBody(sugg.body)
    setPatternReason(sugg.patternReason)

    const media = sugg.proofMediaUrls || []
    setAvailableProofMedia(media)
    setSelectedProofMedia(media)

    setPublishSuccess(null)
    setIsModalOpen(true)
  }

  // Publish & Sync to Facebook Page
  const handlePublishAdvisory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setPublishing(true)
    setPublishSuccess(null)

    try {
      const res = await createAndPublishAdvisory({
        title,
        body,
        type: category,
        severity,
        patternSummary: patternReason,
        mediaUrls: selectedProofMedia,
      })

      if (res.syncedToFacebook) {
        setPublishSuccess(`Published & Synced to Facebook Page! ✅ (Post ID: ${res.fbPostId})`)
      } else {
        setPublishSuccess(`Published to Public Portal & Recorded in System! 🌐 (${res.syncStatusNote})`)
      }

      // Reload tracking list from Supabase
      await loadTrackingData()

      // Close modal after brief delay
      setTimeout(() => {
        setIsModalOpen(false)
        setTitle('')
        setBody('')
        setPatternReason('')
      }, 1500)
    } catch (err: any) {
      alert(`Publishing notice: ${err?.message || 'Advisory published'}`)
    } finally {
      setPublishing(false)
    }
  }

  const filtered = posts.filter((p) => {
    if (filter === 'flagged') return p.ai_flagged && !p.converted_to_ticket
    if (filter === 'converted') return p.converted_to_ticket
    return true
  })

  const totalPostPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginatedPosts = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const totalDmPages = Math.max(1, Math.ceil(conversations.length / PER_PAGE))
  const paginatedDms = conversations.slice((dmPage - 1) * PER_PAGE, dmPage * PER_PAGE)

  const flaggedCount = posts.filter((p) => p.ai_flagged && !p.converted_to_ticket).length

  const handleConvert = (post: FbPost) => {
    openModal({
      title: 'Create Incident Ticket',
      description: 'This will create a new rescue ticket from this Facebook post.',
      icon: <Flag size={20} className="text-red-600" />,
      confirmLabel: 'Create Ticket',
      danger: false,
      onConfirm: async () => {
        setConverting(post.id)
        await convertFbPostToTicket(post)
        setConverting(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header & Main Navigation Tabs */}
      <div className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Facebook Broadcast & AI Pattern Intelligence Center</h2>
              <p className="text-xs text-gray-500">Auto-generate disaster advisories from {incidents.length} live incident patterns & sync to Facebook Page</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <span className="px-3 py-1.5 text-xs font-black text-white bg-red-600 rounded-xl shadow-2xs flex items-center gap-1">
                <AlertTriangle size={13} /> {flaggedCount} Flagged Post{flaggedCount > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setPublishSuccess(null); setIsModalOpen(true) }}
              className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={15} /> New Facebook Broadcast 📢
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {(['fb_sync', 'all', 'flagged', 'converted', 'messenger'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); setDmPage(1) }}
              className={`px-3.5 py-1.5 text-xs font-extrabold capitalize rounded-lg transition-all cursor-pointer ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {f === 'fb_sync' ? '📢 Facebook Broadcast & AI Patterns' : f === 'messenger' ? '💬 Messenger DMs' : `FB ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Facebook Broadcast & AI Patterns ── */}
      {filter === 'fb_sync' && (
        <div className="flex flex-col gap-6">

          {/* AI Recommended Incident Pattern Advisories */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-100 text-amber-700 rounded-lg">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    AI Pattern Suggestions (Based on Recent Incidents)
                  </h3>
                  <p className="text-[11px] font-semibold text-gray-500">
                    AI detected high-frequency emergency clusters across active incident reports
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {suggestions.length} Patterns Detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {suggestions.map((sugg) => (
                <div
                  key={sugg.id}
                  className="p-4 bg-gradient-to-b from-gray-50 to-amber-50/30 rounded-xl border border-gray-200 flex flex-col justify-between gap-3 hover:border-amber-400 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 rounded border border-amber-200">
                        {sugg.category}
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {sugg.confidenceScore}% AI Match
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-gray-900 leading-snug line-clamp-2">{sugg.title}</h4>
                    <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{sugg.body}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-gray-500 truncate" title={sugg.patternReason}>
                      📍 {sugg.affectedLocation} ({sugg.reportCount} reports)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdoptSuggestion(sugg)}
                      className="px-2.5 py-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 shrink-0 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Zap size={11} /> Use Draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Tracked Facebook Posts (from Supabase fb_posts_tracking) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" /> System Recorded Facebook Broadcasts ({trackedPosts.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setPublishSuccess(null); setIsModalOpen(true) }}
                  className="px-3 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> Broadcast Modal
                </button>
                <button
                  type="button"
                  onClick={loadTrackingData}
                  className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingTracking ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
            </div>

            {loadingTracking ? (
              <div className="flex items-center justify-center py-10">
                <div className="size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : trackedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center border border-dashed border-gray-200 rounded-xl">
                <Megaphone size={24} className="text-gray-300" />
                <p className="text-xs font-bold text-gray-500">No Facebook broadcasts recorded yet</p>
                <p className="text-[11px] text-gray-400">Adopt an AI pattern suggestion above to publish your first post</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {trackedPosts.map((post) => (
                  <div key={post.id || post.title} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-900 text-white rounded">
                          {post.category || 'Disaster Broadcast'}
                        </span>
                        <h4 className="text-sm font-extrabold text-gray-900">{post.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        {post.fb_post_id ? (
                          <span className="px-2 py-0.5 text-[10px] text-emerald-800 bg-emerald-100 rounded border border-emerald-300 flex items-center gap-1">
                            <CheckCircle size={11} className="text-emerald-600" /> FB Synced ✅
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] text-blue-800 bg-blue-100 rounded border border-blue-200 flex items-center gap-1">
                            <Radio size={11} className="text-blue-600" /> Public Portal Broadcast 🌐
                          </span>
                        )}
                        <span className="text-gray-400 font-mono">{timeAgo(post.created_at || post.synced_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-gray-700">{post.body}</p>

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-200/80 text-[10px] font-semibold text-gray-500">
                      <span className="flex items-center gap-1 text-blue-800">
                        🤖 Auto-broadcasted via RescueLink AI Facebook Sync Engine
                      </span>
                      {post.fb_post_id ? (
                        <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          FB Post ID: {post.fb_post_id}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-600 bg-gray-200/60 px-2 py-0.5 rounded">
                          Recorded in Supabase `fb_posts_tracking`
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Tab 2: Messenger DMs ── */}
      {filter === 'messenger' && (
        <div className="flex flex-col gap-2">
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: '#1877f2' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10" style={{ border: '1px dashed #e5e7eb', borderRadius: 5 }}>
              <MessageCircle size={18} className="text-gray-300" />
              <p className="text-xs font-semibold text-gray-400">No Messenger DMs yet</p>
              <p className="text-[11px] text-gray-400">Messages sent to your FB page will appear here</p>
            </div>
          ) : (
            <>
              {paginatedDms.map((c) => <ConversationCard key={c.sender_id} convo={c} />)}
              <Pagination page={dmPage} totalPages={totalDmPages} total={conversations.length} onPage={setDmPage} />
            </>
          )}
        </div>
      )}

      {/* ── Tab 3: Incoming Citizen Facebook Posts ── */}
      {filter !== 'fb_sync' && filter !== 'messenger' && (loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: '#b91c1c' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-10 text-center"
          style={{ border: '1px dashed #e5e7eb', borderRadius: 5 }}
        >
          <CheckCircle size={18} className="text-gray-300" />
          <p className="text-xs font-semibold text-gray-400">No {filter} posts</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {paginatedPosts.map((post) => {
              const badge = post.severity ? SEVERITY_BADGE[post.severity] : null
              return (
                <div
                  key={post.id}
                  className="flex flex-col gap-2.5 bg-white p-4"
                  style={{
                    border: `1px solid ${post.ai_flagged && !post.converted_to_ticket ? '#fecaca' : '#e5e7eb'}`,
                    borderRadius: 5,
                    background: post.ai_flagged && !post.converted_to_ticket ? '#fffafa' : '#fff',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full" style={{ background: '#1877f2' }}>
                        <svg viewBox="0 0 24 24" fill="white" width="11" height="11">
                          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                        </svg>
                      </div>
                      <span className="text-[12px] font-extrabold text-gray-900">{post.page_name}</span>
                      <span className="text-[11px] text-gray-400">{timeAgo(post.posted_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {post.severity && badge && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-extrabold capitalize"
                          style={{ borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                        >
                          <span
                            className="mr-1 inline-block size-1.5 rounded-full"
                            style={{ background: SEVERITY_DOT[post.severity], verticalAlign: 'middle' }}
                          />
                          {post.severity}
                        </span>
                      )}
                      {post.ai_flagged && !post.converted_to_ticket && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold"
                          style={{ borderRadius: 4, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                        >
                          <AlertTriangle size={9} /> AI Flagged
                        </span>
                      )}
                      {post.converted_to_ticket && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold"
                          style={{ borderRadius: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                        >
                          <CheckCircle size={9} /> Ticket Created
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-700 line-clamp-3">{post.message}</p>

                  {post.ai_summary && (
                    <div className="rounded px-3 py-2" style={{ background: '#f9fafb', border: '1px solid #f0f0f0' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">AI Summary</p>
                      <p className="mt-0.5 text-xs text-gray-600">{post.ai_summary}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {!post.converted_to_ticket && post.ai_flagged && (
                        <button
                          onClick={() => handleConvert(post)}
                          disabled={converting === post.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#b91c1c', borderRadius: 5 }}
                        >
                          <Clock size={11} />
                          {converting === post.id ? 'Creating…' : 'Create Ticket'}
                        </button>
                      )}
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700"
                      >
                        <ExternalLink size={11} /> View on Facebook
                      </a>
                    </div>
                    {post.fb_sender_id && (
                      <MessengerThread fbSenderId={post.fb_sender_id} senderName={post.page_name} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination page={page} totalPages={totalPostPages} total={filtered.length} onPage={setPage} />
        </>
      ))}

      {/* ── Facebook Page Broadcast Publisher Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-blue-700 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-600/50">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Facebook Page Broadcast Publisher</h3>
                  <p className="text-xs text-blue-300">Connected FB Page ID: 1232412116623460</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublishAdvisory} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1 block">
                    Broadcast Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PUBLIC DISASTER ADVISORY: Flash Flood Warning"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-800/90 text-white placeholder:text-gray-400 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-blue-700/60 outline-none focus:border-blue-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1 block">
                    Disaster Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800/90 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-blue-700/60 outline-none focus:border-blue-400 transition-colors"
                  >
                    {category && !['Flash Flood', 'Typhoon & Winds', 'Fire Emergency', 'Landslide', 'General Safety'].includes(category) && (
                      <option value={category}>🚨 {category} (AI Selected)</option>
                    )}
                    <option value="Flash Flood">🌊 Flash Flood</option>
                    <option value="Typhoon & Winds">🌀 Typhoon & Winds</option>
                    <option value="Fire Emergency">🔥 Fire Emergency</option>
                    <option value="Landslide">⛰️ Landslide</option>
                    <option value="General Safety">📢 General Safety</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1 block">
                  Broadcast Message & Safety Instructions *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter official public disaster safety instructions, evacuation guidance, and emergency hotlines..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-800/90 text-white placeholder:text-gray-400 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-blue-700/60 outline-none focus:border-blue-400 transition-colors leading-relaxed"
                />
              </div>

              {availableProofMedia.length > 0 && (
                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-blue-700/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-blue-400" /> Attached Proof Attachments ({selectedProofMedia.length} of {availableProofMedia.length} selected for Facebook Post)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProofMedia(availableProofMedia)}
                        className="text-[10px] font-extrabold text-blue-300 hover:text-white underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-blue-500">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProofMedia([])}
                        className="text-[10px] font-extrabold text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {availableProofMedia.map((url, idx) => {
                      const isChecked = selectedProofMedia.includes(url)
                      const isAudio = url.toLowerCase().includes('.mp3') || url.toLowerCase().includes('.wav') || url.toLowerCase().includes('audio')
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleProofMedia(url)}
                          className={`relative p-2 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isChecked
                              ? 'border-blue-400 bg-blue-950/80 ring-2 ring-blue-500/40'
                              : 'border-slate-700 bg-slate-900/60 opacity-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="absolute top-1.5 left-1.5 size-3.5 rounded accent-blue-600 pointer-events-none"
                          />
                          {isAudio ? (
                            <div className="size-14 flex flex-col items-center justify-center text-purple-300">
                              <Volume2 size={22} />
                              <span className="text-[8px] font-bold mt-1">Voice SOS</span>
                            </div>
                          ) : (
                            <img src={url} alt="Proof" className="size-14 object-cover rounded shadow-xs" />
                          )}
                          <span className={`text-[9px] font-bold truncate w-full text-center px-1 ${isChecked ? 'text-blue-300' : 'text-gray-400'}`}>
                            {isChecked ? '✓ Sync to FB' : 'Excluded'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {publishSuccess && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-blue-800/60">
                <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1.5">
                  <Share2 size={13} className="text-blue-400" />
                  Posts directly to Facebook Page & records in Supabase `fb_posts_tracking`
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl shadow-lg border border-blue-500/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <Send size={14} className={publishing ? 'animate-spin' : ''} />
                    {publishing ? 'Publishing & Syncing…' : 'Publish & Sync to Facebook Page 📢'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}