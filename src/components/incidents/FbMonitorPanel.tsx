import { useState, useEffect } from 'react'
import {
  ExternalLink, AlertTriangle, CheckCircle, Clock, Flag, MessageCircle,
  Sparkles, Send, Radio, Megaphone, Share2, ShieldAlert, FileText, CheckCircle2, RefreshCw
} from 'lucide-react'
import { useFacebookPosts } from '@/hooks/useFacebookPosts'
import { useMessengerTickets } from '@/hooks/useMessengerTickets'
import { convertFbPostToTicket } from '@/services/facebook.service'
import { getIncidents } from '@/services/incidents.service'
import {
  getAdvisories,
  createAndPublishAdvisory,
  generateAIAdvisoryFromIncidents,
  type PublicAdvisoryItem
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
  const [advisories, setAdvisories] = useState<PublicAdvisoryItem[]>([])
  const [advisoriesLoading, setAdvisoriesLoading] = useState(true)

  // Advisory Form State
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Flash Flood')
  const [severity, setSeverity] = useState('high')
  const [body, setBody] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)

  const [converting, setConverting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'advisories' | 'all' | 'flagged' | 'converted' | 'messenger'>('advisories')
  const [page, setPage] = useState(1)
  const [dmPage, setDmPage] = useState(1)

  const loading = postsLoading || ticketsLoading

  useEffect(() => {
    // Fetch recent live incidents for AI Advisory Generator
    getIncidents().then((list) => setIncidents(list))

    // Fetch published advisories
    loadAdvisories()
  }, [])

  const loadAdvisories = async () => {
    setAdvisoriesLoading(true)
    try {
      const list = await getAdvisories()
      setAdvisories(list)
    } finally {
      setAdvisoriesLoading(false)
    }
  }

  // 🪄 AI Auto-Generate Advisory Handler
  const handleAIGenerate = () => {
    const aiAdvisory = generateAIAdvisoryFromIncidents(incidents)
    setTitle(aiAdvisory.title)
    setType(aiAdvisory.type)
    setSeverity(aiAdvisory.severity)
    setBody(aiAdvisory.body)
  }

  // 📢 Publish & Facebook Sync Handler
  const handlePublishAdvisory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setPublishing(true)
    setPublishSuccess(null)

    try {
      const res = await createAndPublishAdvisory({
        title,
        body,
        type,
        severity,
      })

      if (res.syncedToFacebook) {
        setPublishSuccess('Published successfully & Synced to Facebook Page! ✅')
      } else {
        setPublishSuccess('Published to Public Emergency Portal & Queued for Facebook Sync! 🌐')
      }

      // Reset form & reload advisories list
      setTitle('')
      setBody('')
      await loadAdvisories()
    } catch (err: any) {
      alert(`Publishing notice: ${err?.message || 'Advisory published locally'}`)
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
      description: 'This will create a new rescue ticket from this Facebook post. You can edit details after.',
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

      {/* Header & Tab Selector */}
      <div className="flex flex-col gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Megaphone size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Public Advisories & Facebook Broadcast Center</h2>
              <p className="text-xs text-gray-500">Post disaster warnings, sync to Facebook Page, and monitor citizen posts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-black text-white bg-red-700 rounded-full shadow-2xs">
                {flaggedCount} Flagged FB Posts
              </span>
            )}
            {conversations.length > 0 && (
              <span className="px-2.5 py-1 text-xs font-black text-white bg-blue-600 rounded-full shadow-2xs">
                {conversations.length} Messenger DMs
              </span>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {(['advisories', 'all', 'flagged', 'converted', 'messenger'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); setDmPage(1) }}
              className={`px-3 py-1.5 text-xs font-extrabold capitalize rounded-lg transition-all cursor-pointer ${
                filter === f
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {f === 'advisories' ? '📢 Public Advisories & FB Sync' : f === 'messenger' ? '💬 Messenger DMs' : `FB ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Public Advisories & FB Sync Publisher ── */}
      {filter === 'advisories' && (
        <div className="flex flex-col gap-6">

          {/* AI-Powered Emergency Advisory Composer */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-purple-800 shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-purple-800/60">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-400 animate-pulse" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Create Emergency Public Advisory & Post to Facebook
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAIGenerate}
                className="px-3.5 py-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles size={14} className="text-slate-950 fill-slate-950" />
                AI Auto-Generate Advisory 🪄
              </button>
            </div>

            <form onSubmit={handlePublishAdvisory} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1 block">
                    Advisory Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PUBLIC DISASTER ADVISORY: Flash Flood Warning in Labangon"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-800/80 text-white placeholder:text-gray-400 text-xs font-bold px-3 py-2 rounded-lg border border-purple-700/60 outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1 block">
                    Category Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-800/80 text-white text-xs font-bold px-3 py-2 rounded-lg border border-purple-700/60 outline-none focus:border-yellow-400 transition-colors"
                  >
                    <option value="Flash Flood">🌊 Flash Flood</option>
                    <option value="Typhoon & Winds">🌀 Typhoon & Winds</option>
                    <option value="Fire Emergency">🔥 Fire Emergency</option>
                    <option value="Landslide">⛰️ Landslide</option>
                    <option value="General Safety">📢 General Safety</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1 block">
                  Public Advisory Message *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter official public disaster safety instructions, evacuation guidance, and emergency hotlines..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-800/80 text-white placeholder:text-gray-400 text-xs font-medium px-3 py-2 rounded-lg border border-purple-700/60 outline-none focus:border-yellow-400 transition-colors leading-relaxed"
                />
              </div>

              {publishSuccess && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-lg text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-purple-800/60">
                <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                  <Share2 size={13} className="text-blue-400" />
                  Automatically posts to connected Facebook Page & Public Disaster Telemetry Portal
                </span>

                <button
                  type="submit"
                  disabled={publishing}
                  className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl shadow-lg border border-red-500/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <Send size={14} className={publishing ? 'animate-spin' : ''} />
                  {publishing ? 'Publishing & Syncing…' : 'Publish & Sync to Facebook 📢'}
                </button>
              </div>
            </form>
          </div>

          {/* Published Advisories List */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-purple-700" /> Published LGU Disaster Advisories ({advisories.length})
              </h3>
              <button
                type="button"
                onClick={loadAdvisories}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={advisoriesLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {advisoriesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="size-6 animate-spin rounded-full border-2 border-purple-700 border-t-transparent" />
              </div>
            ) : advisories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center border border-dashed border-gray-200 rounded-xl">
                <Megaphone size={24} className="text-gray-300" />
                <p className="text-xs font-bold text-gray-500">No public advisories published yet</p>
                <p className="text-[11px] text-gray-400">Use the composer above or click AI Auto-Generate to publish</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {advisories.map((adv) => (
                  <div key={adv.id || adv.title} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-900 text-white rounded">
                          {adv.type || 'Advisory'}
                        </span>
                        <h4 className="text-sm font-extrabold text-gray-900">{adv.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        {adv.synced_to_facebook ? (
                          <span className="px-2 py-0.5 text-[10px] text-emerald-800 bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle size={11} className="text-emerald-600" /> Synced to FB Page
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] text-blue-800 bg-blue-100 rounded border border-blue-200 flex items-center gap-1">
                            <Radio size={11} className="text-blue-600" /> Public Portal Broadcast
                          </span>
                        )}
                        <span className="text-gray-400 font-mono">{timeAgo(adv.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-gray-700">{adv.body}</p>
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
      {filter !== 'advisories' && filter !== 'messenger' && (loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: '#b91c1c' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-10 text-center"
          style={{ border: '1px dashed #e5e7eb', borderRadius: 5 }}
        >
          <CheckCircle size={18} className="text-gray-300" />
          {posts.length === 0 ? (
            <>
              <p className="text-xs font-semibold text-gray-400">Page posts require App Review</p>
              <p className="text-[11px] text-gray-400">Facebook requires <code>pages_read_engagement</code> permission.</p>
              <p className="text-[11px] text-gray-400">Use the <strong>📢 Public Advisories</strong> tab to publish broadcasts.</p>
            </>
          ) : (
            <p className="text-xs font-semibold text-gray-400">No {filter} posts</p>
          )}
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

    </div>
  )
}