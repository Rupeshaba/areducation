import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Share2, Send } from 'lucide-react'
import toast from 'react-hot-toast'

/* WhatsApp brand glyph (lucide has no brand icons) */
function WhatsAppIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.599 5.353l-.999 3.648 3.9-1.023zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  )
}

/* Telegram glyph */
function TelegramIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

/**
 * Share sheet for a quiz. `shareUrl` should be the direct play link
 * (…/play/:subject/:name). `quizName` is used in the pre-filled message.
 */
export default function ShareQuizModal({ open, onClose, quizName, subject, shareUrl }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  if (!shareUrl) return null

  const message =
    `🎯 *${quizName || 'Quiz'}* — AR Education\n\n` +
    `Is quiz me apna score azmao! 🚀\n` +
    `Dekhte hain kaun top karta hai 🏆\n\n` +
    `👉 ${shareUrl}`

  const encoded = encodeURIComponent(message)
  const waLink = `https://wa.me/?text=${encoded}`
  const tgLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(quizName || 'Quiz — AR Education')}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: quizName || 'AR Education Quiz', text: message, url: shareUrl })
      } catch { /* user cancelled */ }
    } else {
      copyLink()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-[#0d0d1a] border border-violet-500/20 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl"
          >
            {/* handle (mobile) */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/15 mx-auto mb-4" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Share2 size={18} className="text-violet-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">Share Quiz</h3>
                  <p className="text-gray-500 text-xs line-clamp-1 max-w-[200px]">{quizName}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            {/* Share targets */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] transition-all active:scale-95"
              >
                <span className="text-emerald-400"><WhatsAppIcon /></span>
                <span className="text-[11px] font-semibold text-gray-300">WhatsApp</span>
              </a>
              <a
                href={tgLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-sky-500/40 hover:bg-sky-500/[0.06] transition-all active:scale-95"
              >
                <span className="text-sky-400"><TelegramIcon /></span>
                <span className="text-[11px] font-semibold text-gray-300">Telegram</span>
              </a>
              <button
                onClick={nativeShare}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition-all active:scale-95"
              >
                <span className="text-violet-300"><Send size={22} /></span>
                <span className="text-[11px] font-semibold text-gray-300">More</span>
              </button>
            </div>

            {/* Copy link */}
            <div className="flex items-center gap-2 p-2 pl-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <span className="flex-1 text-xs text-gray-400 truncate">{shareUrl}</span>
              <button
                onClick={copyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  copied ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                         : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
