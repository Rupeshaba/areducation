import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Play, ArrowRight, ChevronLeft, Clock, BookOpen } from 'lucide-react'
import CardThumbnail from '../../components/CardThumbnail'

/* ═══ HISTORY CARD ═══ */
function HistoryCard({ item, index }) {
  const itemUrl = item.courseId && item.subjectId && item.contentId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}`
    : item.courseId && item.subjectId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}`
    : '#'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.03, duration: 0.4 }}
    >
      <Link to={itemUrl} className="block group">
        <div className="p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.08) 0%, rgba(255, 107, 74, 0.02) 100%)',
            border: '1px solid rgba(255, 107, 74, 0.18)',
          }}
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-md bg-white/[0.03]"
            style={{ border: '1px solid rgba(255, 107, 74, 0.15)' }}>
            <CardThumbnail
              item={item}
              alt=""
              fallback={<Play size={18} className="text-primary-400" />}
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={12} fill="white" color="white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-primary-400 transition-colors duration-200">
              {item.title || 'Untitled Lesson'}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: item.type === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 107, 74, 0.15)',
                  color: item.type === 'pdf' ? '#ef4444' : '#FF9270',
                }}>
                {item.type === 'pdf' ? 'PDF' : 'Video'}
              </span>
              {item.lastActiveAt && (
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <Clock size={9} />
                  {new Date(item.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-all duration-300 bg-primary-500/10 border border-primary-500/20">
            <ArrowRight size={12} className="text-primary-400" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ MAIN WATCH HISTORY VIEW ═══ */
export default function WatchHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ar_recently_watched') || '[]')
      setHistory(stored)
    } catch (e) {
      console.error('Error loading watch history:', e)
    }
  }, [])

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Watch History</h1>
          <p className="text-xs text-white/40">Your recently watched content</p>
        </div>
      </div>

      {/* History List */}
      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item, idx) => (
            <HistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Clock size={48} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40">No watch history yet</p>
          <p className="text-xs text-white/30 mt-1">Start watching content to see it here</p>
        </div>
      )}
    </div>
  )
}
