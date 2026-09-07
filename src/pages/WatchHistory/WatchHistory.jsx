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
        <div className="p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 bg-white border border-black/5 hover:shadow-md hover:border-primary-500/20"
        >
          <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
            <CardThumbnail
              item={item}
              alt=""
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={12} fill="white" color="white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors duration-200">
              {item.title || 'Untitled Lesson'}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                item.type === 'pdf'
                  ? 'bg-danger-500/10 text-danger-600 border-danger-500/20'
                  : 'bg-primary-500/10 text-primary-600 border-primary-500/20'
              }`}>
                {item.type === 'pdf' ? 'PDF' : 'Video'}
              </span>
              {item.lastActiveAt && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={9} />
                  {new Date(item.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-all duration-300 bg-primary-500/10 border border-primary-500/20">
            <ArrowRight size={12} className="text-primary-500" />
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
    <div className="max-w-2xl mx-auto flex flex-col h-full">
      {/* Header — static */}
      <div className="flex items-center gap-3 pt-2 pb-4 flex-shrink-0">
        <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Watch History</h1>
          <p className="text-xs text-gray-500">Your recently watched content</p>
        </div>
      </div>

      {/* History List — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {history.length > 0 ? (
          <div className="space-y-3 pb-4">
            {history.map((item, idx) => (
              <HistoryCard key={item.contentId || idx} item={item} index={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Clock size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No watch history yet</p>
            <p className="text-xs text-gray-400 mt-1">Start watching content to see it here</p>
          </div>
        )}
      </div>
    </div>
  )
}
