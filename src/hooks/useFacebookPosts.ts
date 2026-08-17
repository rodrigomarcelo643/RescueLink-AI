import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import type { FbPost } from '@/types/fbPost'
import { getFbPostsTracking } from '@/services/advisories.service'

export function useFacebookPosts() {
  const [posts, setPosts] = useState<FbPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    try {
      const { data } = await supabase
        .from('fb_posts')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(40)

      const dbPosts = (data ?? []) as FbPost[]

      // Also load tracked broadcast posts to guarantee that all automated posts appear across all user accounts
      const tracked = await getFbPostsTracking()
      const trackedAsFbPosts: FbPost[] = tracked.map((t, idx) => ({
        id: t.id || `tracked_${idx}`,
        post_id: t.fb_post_id || `auto_${idx}`,
        fb_sender_id: 'lgu_official',
        page_name: 'RescueLink Official (Automated Facebook Broadcast)',
        message: `${t.title.toUpperCase()}\n\n${t.body}`,
        permalink: t.fb_post_id ? `https://facebook.com/${t.fb_post_id}` : 'https://facebook.com',
        posted_at: t.synced_at || t.created_at || new Date().toISOString(),
        created_at: t.created_at || new Date().toISOString(),
        ai_flagged: false,
        ai_summary: t.title,
        severity: (t.severity as any) || 'high',
        converted_to_ticket: false,
        ticket_id: null,
      }))

      // Merge and deduplicate by post_id or title
      const postMap = new Map<string, FbPost>()
      dbPosts.forEach((p) => postMap.set(p.post_id || p.id, p))
      trackedAsFbPosts.forEach((p) => {
        const key = p.post_id || p.id
        if (!postMap.has(key)) {
          postMap.set(key, p)
        }
      })

      const merged = Array.from(postMap.values()).sort(
        (a, b) => new Date(b.posted_at || b.created_at).getTime() - new Date(a.posted_at || a.created_at).getTime()
      )

      setPosts(merged)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()

    const channelName = `fb_posts_realtime_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fb_posts' },
        () => fetchPosts()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fb_posts' },
        () => fetchPosts()
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [])

  return { posts, loading, refresh: fetchPosts }
}
