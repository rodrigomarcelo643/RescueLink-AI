import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, Video, Play, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react'

interface ProofCarouselProps {
  urls: string[]
  compact?: boolean
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase().split('?')[0].split('#')[0]
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.mkv') ||
    lower.endsWith('.3gp') ||
    lower.startsWith('data:video/') ||
    lower.includes('video') ||
    (lower.startsWith('blob:') && (lower.includes('video') || lower.includes('mp4') || lower.includes('webm')))
  )
}

function LightboxModal({ urls, initialIndex, onClose }: { urls: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex)

  const prev = () => setIndex((c) => (c - 1 + urls.length) % urls.length)
  const next = () => setIndex((c) => (c + 1) % urls.length)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [urls.length])

  const isCurrentVideo = isVideoUrl(urls[index])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.88)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
        >
          <X size={18} />
        </button>

        {/* Header Counter */}
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
          {isCurrentVideo ? <Video size={12} className="text-red-400" /> : <ImageIcon size={12} />}
          <span>{index + 1} / {urls.length} {isCurrentVideo ? '(Video)' : ''}</span>
        </div>

        {/* Active Media */}
        <motion.div
          key={index}
          className="relative max-h-[85vh] max-w-[92vw] overflow-hidden rounded-lg shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {isCurrentVideo ? (
            <video
              src={urls[index]}
              controls
              autoPlay
              className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain bg-black"
            />
          ) : (
            <img
              src={urls[index]}
              alt={`Proof ${index + 1}`}
              className="max-h-[85vh] max-w-[92vw] object-contain select-none"
            />
          )}
        </motion.div>

        {/* Prev / Next Controls */}
        {urls.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 z-50 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:scale-105 hover:bg-white/30"
              aria-label="Previous media"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 z-50 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:scale-105 hover:bg-white/30"
              aria-label="Next media"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Thumbnails strip at bottom */}
        {urls.length > 1 && (
          <div
            className="absolute bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-xl bg-black/60 p-2 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {urls.map((url, i) => {
              const isVid = isVideoUrl(url)
              return (
                <button
                  key={url + i}
                  onClick={() => setIndex(i)}
                  className={`relative size-12 shrink-0 overflow-hidden rounded-md transition-all ${
                    index === i ? 'ring-2 ring-red-500 scale-105 opacity-100' : 'opacity-50 hover:opacity-85'
                  }`}
                >
                  {isVid ? (
                    <div className="relative size-full bg-black">
                      <video src={url} className="size-full object-cover" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Video size={10} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <img src={url} alt={`Thumb ${i + 1}`} className="size-full object-cover" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default function ProofCarousel({ urls, compact = false }: ProofCarouselProps) {
  const [active, setActive] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!urls || urls.length === 0) {
    return <span className="text-xs text-gray-400 italic">No media</span>
  }

  // Single Item View
  if (urls.length === 1) {
    const isVid = isVideoUrl(urls[0])
    return (
      <>
        <div className="relative group inline-block overflow-hidden rounded-md border border-gray-200 bg-gray-900">
          {isVid ? (
            <div
              className={`${compact ? 'size-12' : 'size-16'} relative cursor-pointer bg-black flex items-center justify-center`}
              onClick={() => setLightboxIndex(0)}
            >
              <video src={urls[0]} className="size-full object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                <div className="flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                  <Play size={10} className="ml-0.5 fill-white" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={urls[0]}
              alt="Proof"
              className={`${compact ? 'size-12' : 'size-16'} object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105`}
              onClick={() => setLightboxIndex(0)}
            />
          )}

          <button
            onClick={() => setLightboxIndex(0)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity text-white"
          >
            <Maximize2 size={12} />
          </button>
        </div>

        {lightboxIndex !== null && (
          <LightboxModal urls={urls} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
      </>
    )
  }

  // Multi-Media Carousel View (2+ items)
  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActive((curr) => (curr + 1) % urls.length)
  }

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActive((curr) => (curr - 1 + urls.length) % urls.length)
  }

  const widthClass = compact ? 'w-36 h-20' : 'w-44 h-26'
  const activeIsVid = isVideoUrl(urls[active])

  return (
    <>
      <div className={`relative group ${widthClass} overflow-hidden rounded-md border border-gray-200 bg-gray-900 select-none`}>
        {/* Active slide */}
        <AnimatePresence mode="wait">
          {activeIsVid ? (
            <motion.div
              key={active}
              className="size-full relative bg-black cursor-pointer"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.15 }}
              onClick={() => setLightboxIndex(active)}
            >
              <video src={urls[active]} className="size-full object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                <div className="flex size-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                  <Play size={11} className="ml-0.5 fill-white" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.img
              key={active}
              src={urls[active]}
              alt={`Proof ${active + 1}`}
              className="size-full object-cover cursor-pointer"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.15 }}
              onClick={() => setLightboxIndex(active)}
            />
          )}
        </AnimatePresence>

        {/* Counter Badge */}
        <div className="absolute top-1 right-1 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs pointer-events-none">
          {activeIsVid ? <Video size={9} className="text-red-400" /> : <ImageIcon size={9} />}
          <span>{active + 1}/{urls.length}</span>
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-1 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-80 hover:opacity-100 hover:bg-black/80 transition-all shadow-sm"
          title="Previous media"
        >
          <ChevronLeft size={14} />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-80 hover:opacity-100 hover:bg-black/80 transition-all shadow-sm"
          title="Next media"
        >
          <ChevronRight size={14} />
        </button>

        {/* Bottom Pagination Dots */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 max-w-[90%] overflow-hidden px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs">
          {urls.map((url, idx) => {
            const dotIsVid = isVideoUrl(url)
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive(idx) }}
                className={`rounded-full transition-all ${
                  active === idx
                    ? dotIsVid ? 'bg-red-500 w-2.5 h-1' : 'bg-white w-2.5 h-1'
                    : 'bg-white/50 hover:bg-white/80 size-1'
                }`}
              />
            )
          })}
        </div>

        {/* Expand Overlay on hover */}
        <button
          type="button"
          onClick={() => setLightboxIndex(active)}
          className="absolute top-1 left-1 flex size-5 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Expand media"
        >
          <Maximize2 size={10} />
        </button>
      </div>

      {lightboxIndex !== null && (
        <LightboxModal urls={urls} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  )
}
