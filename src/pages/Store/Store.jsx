import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ShoppingBag, CheckCircle, Upload, QrCode, BookOpen, Play, ExternalLink, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'

function CourseCard({ course, isPurchased, onBuy, purchaseStatus }) {
  const defaultThumb = null

  const [showDetail, setShowDetail] = useState(false)

  if (showDetail && course.exploreUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden h-full flex flex-col"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h2 className="font-bold text-white">{course.name}</h2>
          <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white">
            <ExternalLink size={16} />
          </button>
        </div>
        
        <div className="flex-1 mb-4">
          <p className="text-sm text-gray-300 mb-4">{course.description}</p>
          
          {course.subjects?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Subjects included:</p>
              <div className="flex flex-wrap gap-1">
                {course.subjects.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-primary-500/15 text-primary-400 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p>🕐 Access: {course.durationDays || 365} days</p>
            <p className="mt-1">💰 Price: ₹{course.price}</p>
          </div>
        </div>

        <button onClick={() => setShowDetail(false)} className="btn-primary w-full">
          Back to Course
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden group"
    >
      {/* Thumbnail */}
      <div className="relative -mx-4 -mt-4 mb-4 h-40 bg-dark-700">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-600/20 to-primary-500/5">
            <BookOpen size={40} className="text-primary-500/40" />
          </div>
        )}
        {isPurchased && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={11} /> Enrolled
          </div>
        )}
      </div>

      <h3 className="font-bold text-white mb-1">{course.name}</h3>
      {course.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{course.description}</p>}

      {/* Subjects list */}
      {course.subjects?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {course.subjects.slice(0, 4).map((s, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded-full">{s}</span>
          ))}
          {course.subjects.length > 4 && (
            <span className="text-xs px-2 py-0.5 bg-dark-700 text-gray-500 rounded-full">+{course.subjects.length - 4} more</span>
          )}
        </div>
      )}

      {course.durationDays && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <Clock size={11} /> {course.durationDays} days access
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-primary-400">₹{course.price}</div>
        <div className="flex gap-2">
          {course.exploreUrl && (
            <button onClick={() => setShowDetail(true)}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
              <ExternalLink size={12} /> Details
            </button>
          )}
          {isPurchased ? (
            <Link to="/subjects" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
              <Play size={12} /> Start Learning
            </Link>
          ) : purchaseStatus === 'pending' ? (
            <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 font-medium">
              Pending Review
            </span>
          ) : (
            <button onClick={() => onBuy(course)} className="btn-primary text-xs py-1.5 px-3">
              Buy Now
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Store() {
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [txnId, setTxnId] = useState('')
  const [file, setFile] = useState(null)
  const [step, setStep] = useState('browse')
  const qc = useQueryClient()

  const { data: coursesData } = useQuery({ queryKey: ['courses'], queryFn: () => api.get('/store/courses').then(r => r.data) })
  const { data: purchasesData } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/store/my-purchases').then(r => r.data) })
  const { data: settingsData } = useQuery({ queryKey: ['payment-settings'], queryFn: () => api.get('/store/payment-settings').then(r => r.data) })

  const courses = coursesData?.courses || []
  const purchases = purchasesData?.purchases || []
  const settings = settingsData?.settings || {}

  const getPurchaseStatus = (courseId) => {
    const p = purchases.find(p => p.courseId === courseId)
    return p?.active ? 'purchased' : null
  }

  const submitPayment = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Screenshot is required')
      const fd = new FormData()
      fd.append('courseId', selectedCourse.id)
      if (txnId) fd.append('transactionId', txnId)
      fd.append('screenshot', file)
      return api.post('/store/submit-payment', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
    },
    onSuccess: () => {
      toast.success('Payment submitted! Awaiting admin approval.')
      setStep('browse'); setSelectedCourse(null); setTxnId(''); setFile(null)
      qc.invalidateQueries(['purchases'])
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  })

  if (step === 'payment' && selectedCourse) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Complete Payment</h1>
        <div className="card mb-4">
          <div className="font-semibold text-white mb-1">{selectedCourse.name}</div>
          <div className="text-2xl font-bold text-primary-400">₹{selectedCourse.price}</div>
        </div>

        <div className="card mb-4 text-center">
          <div className="flex items-center gap-2 justify-center text-gray-400 mb-3">
            <QrCode size={18} /> Scan to Pay
          </div>
          {settings.qrCodeUrl ? (
            <img src={settings.qrCodeUrl} alt="QR Code" className="w-52 h-52 mx-auto rounded-xl object-contain" />
          ) : (
            <div className="w-52 h-52 mx-auto bg-dark-700 rounded-xl flex items-center justify-center text-gray-500 text-sm">
              QR not set
            </div>
          )}
          {settings.upiId && (
            <div className="mt-3 text-sm text-gray-400">
              UPI: <span className="text-white font-mono">{settings.upiId}</span>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Transaction ID (optional)</label>
            <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="UTR / Transaction ID" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Payment Screenshot <span className="text-red-400">*</span></label>
            <label className={`flex items-center gap-2 input-field cursor-pointer hover:border-primary-500/50 transition-all ${!file && 'border-dashed'}`}>
              <Upload size={15} className="text-gray-500 flex-shrink-0" />
              <span className={`text-sm truncate ${file ? 'text-white' : 'text-gray-500'}`}>
                {file ? file.name : 'Click to upload screenshot'}
              </span>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="hidden" />
            </label>
            <p className="text-xs text-gray-600 mt-1">Screenshot is required for verification</p>
          </div>
          <button
            onClick={() => submitPayment.mutate()}
            disabled={!file || submitPayment.isPending}
            className="btn-primary w-full"
          >
            {submitPayment.isPending ? 'Submitting...' : 'Submit Payment'}
          </button>
          <button onClick={() => setStep('browse')} className="btn-ghost w-full text-sm">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
          <ShoppingBag size={20} className="text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Store</h1>
          <p className="text-gray-500 text-sm">Unlock premium courses</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
          <p>No courses available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              isPurchased={getPurchaseStatus(course.id) === 'purchased'}
              purchaseStatus={getPurchaseStatus(course.id)}
              onBuy={(c) => { setSelectedCourse(c); setStep('payment') }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
