import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Play, ArrowRight, ChevronLeft, Book, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import CardThumbnail from '../../components/CardThumbnail'

/* ═══ COURSE CARD ═══ */
function FreeCourseCard({ course, index, onEnroll, isEnrolled }) {
  const courseId = course.id || course._id

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
    >
      <div className="block group h-full">
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/20 bg-white border border-black/5 h-full flex flex-col"
        >
          {/* Thumbnail — full image visible, no overlay, no crop */}
          <div className="relative w-full aspect-video bg-gray-50 flex-shrink-0">
            <CardThumbnail
              item={course}
              alt={course.name}
              className="group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            {/* Free Badge */}
            <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 backdrop-blur-sm z-10">
              Free
            </span>
          </div>

          {/* Details — below thumbnail, on plain background */}
          <div className="p-3 flex flex-col flex-1">
            <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors duration-200">
              {course.name}
            </h4>
            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
              {course.description || 'Start learning this free course'}
            </p>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5">
              <span className="text-[9px] text-gray-500 font-medium">
                {course.subjectCount || 0} Subjects
              </span>
              {isEnrolled ? (
                <Link to={`/courses/${courseId}/subjects`}
                  className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <CheckCircle size={10} /> Enrolled
                </Link>
              ) : (
                <button onClick={() => onEnroll(courseId)}
                  className="text-[9px] text-primary-600 font-semibold flex items-center gap-0.5 hover:underline">
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
    <div className="max-w-2xl mx-auto flex flex-col h-full">
      {/* Header — static */}
      <div className="flex items-center gap-3 pt-2 pb-4 flex-shrink-0">
        <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Free Courses</h1>
          <p className="text-xs text-gray-500">Learn without any subscription</p>
        </div>
      </div>

      {/* Courses Grid — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[4/3] rounded-2xl bg-gray-100 animate-pulse" />
            <div className="aspect-[4/3] rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pb-4">
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
            <BookOpen size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No free courses available right now</p>
          </div>
        )}
      </div>
    </div>
  )
}
