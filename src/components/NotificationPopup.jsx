import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, ExternalLink } from 'lucide-react'

export default function NotificationPopup({ notif, onClose }) {
  const timerRef = useRef(null)

  // Auto-dismiss after 12s
  useEffect(() => {
    if (!notif) return
    timerRef.current = setTimeout(onClose, 12000)
    return () => clearTimeout(timerRef.current)
  }, [notif])

  const popup = (
    <AnimatePresence>
      {notif && (
        <>
          {/* Backdrop — semi-transparent, click to dismiss */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              style={{ background: '#0f0f1e' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Image banner */}
              {notif.imageUrl && (
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={notif.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <Bell size={16} className="text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400 mb-0.5">Notification</p>
                      {notif.title && (
                        <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                          {notif.title}
                        </h3>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Message / rich content */}
                {(notif.message || notif.richContent) && (
                  <div className="mb-4 pl-[52px]">
                    {notif.richContent ? (
                      <div
                        className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: notif.richContent }}
                      />
                    ) : (
                      <p className="text-sm text-gray-300 leading-relaxed">{notif.message}</p>
                    )}
                  </div>
                )}

                {/* Link + Dismiss row */}
                <div className="flex items-center gap-2 pl-[52px]">
                  {notif.linkUrl && (
                    <a
                      href={notif.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-all"
                    >
                      <ExternalLink size={11} />
                      {notif.linkText || 'Open Link'}
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-xs font-medium transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Auto-dismiss progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 12, ease: 'linear' }}
                className="h-0.5 bg-primary-500/60 origin-left"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(popup, document.body)
}