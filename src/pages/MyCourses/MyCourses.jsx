import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Play, Clock, ShoppingBag, ChevronRight, Calendar, CheckCircle, TrendingUp } from 'lucide-react'
import api from '../../api/axios'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'

export default function MyCourses() {
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
  const purchases = purchasesData?.purchases || []

  // Progress for every purchased course, fetched in parallel and cached
  // (persisted across reloads) — replaces the old sequential per-course
  // backend loop that made this page slow to load.
  const courseIds = purchases.map(p => p.courseId).filter(Boolean)
  const { courseProgress, isLoading: progressLoading } = useCoursesProgress(courseIds)

  const isLoading = purchasesLoading

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (purchases.length === 0) return (
    <div className="flex flex-col items-center py-20 gap-4 text-center max-w-sm mx-auto">
      <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center">
        <BookOpen size={32} className="text-primary-400 opacity-50" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">No Courses Yet</h2>
        <p className="text-gray-600 text-sm">Visit the store to enroll in courses.</p>
      </div>
      <Link to="/store" className="btn-primary flex items-center gap-2">
        <ShoppingBag size={16} /> Browse Courses
      </Link>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {purchases.map((purchase, i) => {
          const course = purchase.courseDetails || {}
          const courseId = course.id || course._id || purchase.courseId
          const isFree = purchase.isFree || course.isFree
          const daysLeft = (!isFree && purchase.expiresAt) ? Math.ceil((purchase.expiresAt - Date.now()) / 86400000) : null
          const isExpired = daysLeft !== null && daysLeft <= 0
          const isUrgent = daysLeft !== null && !isExpired && daysLeft <= 30
          const isBlocked = !!purchase.blocked
          const isLocked = isBlocked || isExpired

          // Get progress from local cache (subject/content structure + local completion state)
          const progress = courseProgress[courseId] || { completed: 0, total: 0 }
          const progressPercent = progress.total > 0
            ? Math.round((progress.completed / progress.total) * 100)
            : 0

          return (
            <motion.div
              key={purchase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-primary-500/25 transition-all group relative h-56">
                {/* Thumbnail fills the entire card */}
                <CardThumbnail
                  item={course}
                  alt={purchase.courseName}
                  className="group-hover:scale-105 transition-transform duration-300"
                  fallback={
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-600/20 via-primary-500/10 to-primary-900/20">
                      <BookOpen size={36} className="text-primary-500/40 mb-1" />
                      <span className="text-primary-400/40 text-xs font-medium uppercase tracking-wider">Course</span>
                    </div>
                  }
                />
                {/* Gradient so the text stays readable over the image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                {/* Free / Expiry / Blocked badge */}
                {isBlocked ? (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm border bg-red-500/20 text-red-300 border-red-500/20">
                    Blocked
                  </div>
                ) : isFree ? (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm border bg-emerald-500/20 text-emerald-300 border-emerald-500/20">
                    FREE
                  </div>
                ) : daysLeft !== null && (
                  <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm border
                    ${isExpired
                      ? 'bg-red-500/20 text-red-300 border-red-500/20'
                      : isUrgent
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20'}`}>
                    <Calendar size={10} />
                    {isExpired ? 'Expired' : `${daysLeft}d left`}
                  </div>
                )}

                {/* Text + actions pinned to the bottom, inside the card, over the image */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-bold text-white text-sm mb-2 line-clamp-2 leading-snug drop-shadow-md">
                    {purchase.courseName}
                  </h3>

                  {/* Progress Bar */}
                  {progress.total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
                        <span>Progress</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  )}

                  {isBlocked && purchase.blockReason && (
                    <p className="text-[11px] text-red-300/90 mb-2 line-clamp-2">{purchase.blockReason}</p>
                  )}

                  <Link
                    to={`/courses/${courseId}/subjects`}
                    onClick={(e) => { if (isLocked) e.preventDefault() }}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all
                      ${isLocked
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed pointer-events-none'
                        : 'bg-primary-500 hover:bg-primary-600 text-white active:scale-95'}`}
                  >
                    <Play size={14} /> {isBlocked ? 'Access Blocked' : 'Start Learning'}
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
