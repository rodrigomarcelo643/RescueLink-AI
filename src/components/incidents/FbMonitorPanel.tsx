import { useState } from 'react'
import { ExternalLink, AlertTriangle, CheckCircle, Clock, Flag, MessageCircle } from 'lucide-react'
import { useFacebookPosts } from '@/hooks/useFacebookPosts'
import { useMessengerTickets } from '@/hooks/useMessengerTickets'
import { convertFbPostToTicket } from '@/services/facebook.service'
import { useModal } from '@/context/ModalContext'
import type { MessengerConversation } from '@/hooks/useMessengerTickets'
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

function timeAgo(dateStr: string) {
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
  const [converting, setConverting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'flagged' | 'converted' | 'messenger'>('all')
  const [page, setPage] = useState(1)
  const [dmPage, setDmPage] = useState(1)

  const loading = postsLoading || ticketsLoading

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
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-full" style={{ background: '#1877f2' }}>
              <svg viewBox="0 0 24 24" fill="white" width="13" height="13">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
            </div>
            <p className="text-sm font-extrabold text-gray-900">Facebook Monitoring</p>
            {flaggedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: '#b91c1c', borderRadius: 4 }}>
                {flaggedCount} flagged
              </span>
            )}
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: '#1877f2', borderRadius: 4 }}>
                {conversations.length} DMs
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'flagged', 'converted', 'messenger'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); setDmPage(1) }}
              className="px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
              style={{
                borderRadius: 5,
                border: '1px solid',
                borderColor: filter === f ? '#b91c1c' : '#e5e7eb',
                background: filter === f ? '#fef2f2' : '#fff',
                color: filter === f ? '#b91c1c' : '#6b7280',
              }}
            >
              {f === 'messenger' ? '💬 DMs' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Messenger DM Tickets */}
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

      {/* Posts */}
      {filter !== 'messenger' && (loading ? (
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
              <p className="text-[11px] text-gray-400">Use the <strong>💬 DMs</strong> tab to see Messenger reports.</p>
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
                  {/* Top row */}
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

                  {/* Message */}
                  <p className="text-xs leading-relaxed text-gray-700 line-clamp-3">{post.message}</p>

                  {/* AI summary */}
                  {post.ai_summary && (
                    <div className="rounded px-3 py-2" style={{ background: '#f9fafb', border: '1px solid #f0f0f0' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">AI Summary</p>
                      <p className="mt-0.5 text-xs text-gray-600">{post.ai_summary}</p>
                    </div>
                  )}

                  {/* Actions + Thread */}
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