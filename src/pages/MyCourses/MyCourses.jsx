import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Play, Clock, ShoppingBag, ChevronRight, Calendar, CheckCircle, TrendingUp, AlertCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'
import { io } from 'socket.io-client'

export default function MyCourses() {
  const qc = useQueryClient()
  const [socket, setSocket] = useState(null)
  const [removingCourses, setRemovingCourses] = useState(new Set())
  const [notifications, setNotifications] = useState([])

  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const purchases = purchasesData?.purchases || []

  // Progress for every purchased course
  const courseIds = purchases.map(p => p.courseId).filter(Boolean)
  const { courseProgress, isLoading: progressLoading } = useCoursesProgress(courseIds)

  // ✅ NEW: Setup Socket.IO connection and listen for real-time updates
  useEffect(() => {
    // Get user ID from auth (you might store this in a context/store)
    const getUserId = async () => {
      try {
        const response = await api.get('/auth/me')
        return response.data?.uid
      } catch {
        return null
      }
    }

    const setupSocket = async () => {
      const userId = await getUserId()
      if (!userId) return

      const socketInstance = io(undefined, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      socketInstance.on('connect', () => {
        socketInstance.emit('join', { userId })
      })

      // ✅ NEW: Listen for course deletion event
      socketInstance.on('course_deleted', (data) => {
        const notifId = Date.now()
        setNotifications(prev => [...prev, { id: notifId, type: 'deleted', ...data }])
        setRemovingCourses(prev => new Set([...prev, data.courseId]))
        
        toast.error(data.message || 'Course deleted', { duration: 5000 })

        // Animate removal after 1 second, then refresh
        setTimeout(() => {
          setRemovingCourses(prev => {
            const next = new Set(prev)
            next.delete(data.courseId)
            return next
          })
          refetchPurchases()
          // Remove notification
          setNotifications(prev => prev.filter(n => n.id !== notifId))
        }, 1000)
      })

      // ✅ NEW: Listen for course hidden (marked inactive) event
      socketInstance.on('course_hidden', (data) => {
        const notifId = Date.now()
        setNotifications(prev => [...prev, { id: notifId, type: 'hidden', ...data }])
        
        toast.error(data.message || 'Course has been hidden', { duration: 5000 })

        // Refresh purchases to show updated status
        setTimeout(() => {
          refetchPurchases()
          setNotifications(prev => prev.filter(n => n.id !== notifId))
        }, 500)
      })

      // ✅ NEW: Listen for course blocked event (access revoked)
      socketInstance.on('course_blocked', (data) => {
        const notifId = Date.now()
        setNotifications(prev => [...prev, { id: notifId, type: 'blocked', ...data }])
        
        toast.error(data.reason || 'Your access to this course has been blocked', { duration: 5000 })

        // Refresh purchases to show blocked status
        setTimeout(() => {
          refetchPurchases()
          setNotifications(prev => prev.filter(n => n.id !== notifId))
        }, 500)
      })

      // ✅ NEW: Listen for course revoked event
      socketInstance.on('course_revoked', (data) => {
        const notifId = Date.now()
        setNotifications(prev => [...prev, { id: notifId, type: 'revoked', ...data }])
        setRemovingCourses(prev => new Set([...prev, data.courseId]))
        
        toast.error(data.message || 'Your access to this course has been revoked', { duration: 5000 })

        setTimeout(() => {
          setRemovingCourses(prev => {
            const next = new Set(prev)
            next.delete(data.courseId)
            return next
          })
          refetchPurchases()
          setNotifications(prev => prev.filter(n => n.id !== notifId))
        }, 1000)
      })

      // ✅ NEW: Listen for course unblocked event
      socketInstance.on('course_unblocked', (data) => {
        toast.success('Your access to this course has been restored', { duration: 4000 })
        refetchPurchases()
      })

      // Handle disconnection
      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      setSocket(socketInstance)
    }

    setupSocket()

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [refetchPurchases])

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

      {/* ✅ NEW: Real-time Notifications Display */}
      <AnimatePresence>
        {notifications.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-4 rounded-xl flex gap-3 items-start border ${
              notif.type === 'deleted'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : notif.type === 'blocked'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                : notif.type === 'revoked'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <div className="font-semibold mb-0.5">{notif.courseName}</div>
              <p className="text-xs opacity-90">{notif.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {purchases.map((purchase, i) => {
            const course = purchase.courseDetails || {}
            const courseId = course.id || course._id || purchase.courseId
            const isFree = purchase.isFree || course.isFree
            const daysLeft = (!isFree && purchase.expiresAt) ? Math.ceil((purchase.expiresAt - Date.now()) / 86400000) : null
            const isExpired = daysLeft !== null && daysLeft <= 0
            const isUrgent = daysLeft !== null && !isExpired && daysLeft <= 30
            const isBlocked = !!purchase.blocked
            const isLocked = isBlocked || isExpired

            // Get progress from local cache
            const progress = courseProgress[courseId] || { completed: 0, total: 0 }
            const progressPercent = progress.total > 0
              ? Math.round((progress.completed / progress.total) * 100)
              : 0

            // Check if course is being removed
            const isRemoving = removingCourses.has(courseId)

            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isRemoving ? 0 : 1, y: 0, scale: isRemoving ? 0.95 : 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-primary-500/25 transition-all group relative h-56">
                  {/* Thumbnail */}
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

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                  {/* Status Badge */}
                  {isBlocked ? (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm border bg-red-500/20 text-red-300 border-red-500/20">
                      <Zap size={10} /> Blocked
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

                  {/* Content */}
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

                    {/* Block Reason */}
                    {isBlocked && purchase.blockReason && (
                      <p className="text-[11px] text-red-300/90 mb-2 line-clamp-2">{purchase.blockReason}</p>
                    )}

                    {/* CTA Button */}
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
        </AnimatePresence>
      </div>
    </div>
  )
}
