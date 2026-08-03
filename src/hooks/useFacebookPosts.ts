import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import type { FbPost } from '@/types/fbPost'

export function useFacebookPosts() {
  const [posts, setPosts] = useState<FbPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('fb_posts')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(25)
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPosts()

    const channel = supabase
      .channel('fb_posts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fb_posts' },
        (payload) => setPosts((prev) => [payload.new as FbPost, ...prev])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fb_posts' },
        (payload) => setPosts((prev) => prev.map((p) => p.id === (payload.new as FbPost).id ? payload.new as FbPost : p))
      )
      .subscribe()

    // Refetch when tab regains focus
    const onFocus = () => fetchPosts()
    window.addEventListener('focus', onFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return { posts, loading }
}
