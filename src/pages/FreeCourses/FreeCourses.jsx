import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Play, ArrowRight, ChevronLeft, Book, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

/* ═══ COURSE CARD ═══ */
function FreeCourseCard({ course, index, onEnroll, isEnrolled }) {
  const courseId = course.id || course._id

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
    >
      <div className="block group">
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/30 flex flex-col"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Thumbnail Container - Square */}
          <div className="relative aspect-square overflow-hidden bg-dark-950">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10142A 0%, #151932 100%)' }}>
                <BookOpen size={28} className="text-white/10" />
              </div>
            )}
            
            {/* Free Badge */}
            <span className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              Free
            </span>
          </div>

          {/* Details */}
          <div className="p-3 flex-1 flex flex-col">
            <h4 className="text-xs font-bold text-white/90 line-clamp-1 group-hover:text-primary-400 transition-colors duration-200">
              {course.name}
            </h4>
            <p className="text-[9px] text-white/40 mt-1 line-clamp-2 flex-1">
              {course.description || 'Start learning this free course'}
            </p>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04]">
              <span className="text-[8px] text-white/40 font-medium">
                {course.subjectCount || 0} Subjects
              </span>
              {isEnrolled ? (
                <Link to={`/courses/${courseId}/subjects`}
                  className="text-[8px] text-emerald-400 font-semibold flex items-center gap-0.5">
                  <CheckCircle size={10} /> Enrolled
                </Link>
              ) : (
                <button onClick={() => onEnroll(courseId)}
                  className="text-[8px] text-primary-400 font-semibold flex items-center gap-0.5 hover:underline">
                  Enroll Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══ MAIN FREE COURSES VIEW ═══ */
export default function FreeCourses() {
  const { data, isLoading } = useQuery({
    queryKey: ['free-courses'],
    queryFn: () => api.get('/free-courses').then(r => r.data),
  })

  const { data: purchasesData } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
  })

  const qc = useQueryClient()
  const enrolledCourseIds = purchasesData?.purchases?.map(p => p.courseId) || []

  const enrollMutation = useMutation({
    mutationFn: (courseId) => api.post('/store/enroll-free', { courseId }).then(r => r.data),
    onSuccess: () => {
      toast.success('Enrolled successfully! Check My Courses.')
      qc.invalidateQueries(['purchases'])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to enroll')
  })

  const handleEnroll = (courseId) => {
    enrollMutation.mutate(courseId)
  }

  const courses = data?.courses || []

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Free Courses</h1>
          <p className="text-xs text-white/40">Learn without any subscription</p>
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-[4/3] rounded-3xl bg-white/[0.03] animate-pulse" />
          <div className="aspect-[4/3] rounded-3xl bg-white/[0.03] animate-pulse" />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {courses.map((course, i) => (
            <FreeCourseCard 
              key={course.id || course._id || i} 
              course={course} 
              index={i} 
              onEnroll={handleEnroll}
              isEnrolled={enrolledCourseIds.includes(course.id || course._id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <BookOpen size={48} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40">No free courses available right now</p>
        </div>
      )}
    </div>
  )
}
