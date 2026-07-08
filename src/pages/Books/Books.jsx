import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Book, FileText, ArrowRight, ChevronLeft, ExternalLink } from 'lucide-react'
import api from '../../api/axios'

/* ═══ BOOK CARD ═══ */
function BookCard({ book, index }) {
  const bookId = book.id || book._id
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
    >
      <Link to={`/books/${bookId}`} className="block group">
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/30"
          style={{
            background: 'rgba(30, 32, 40, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Cover Container - Square shape */}
          <div className="relative aspect-square overflow-hidden bg-dark-800">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E2028 0%, #151932 100%)' }}>
                <Book size={28} className="text-white/10" />
              </div>
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent" />
            
            {/* Open Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300"
                style={{ background: 'rgba(99, 102, 241, 0.9)', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}>
                <ExternalLink size={16} color="white" />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-3">
            <h4 className="text-xs font-bold text-white/90 line-clamp-1 group-hover:text-indigo-400 transition-colors duration-200">
              {book.title}
            </h4>
            <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">
              {book.author || 'AR Education'}
            </p>
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04]">
              <span className="text-[9px] text-white/40 font-medium">
                {book.pages ? `${book.pages} pages` : 'PDF'}
              </span>
              <span className="text-[9px] text-indigo-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform duration-200">
                Open <ArrowRight size={9} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ MAIN BOOKS VIEW ═══ */
export default function Books() {
  const { data, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => api.get('/books').then(r => r.data),
  })

  const books = data?.books || []

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Books Library</h1>
          <p className="text-xs text-white/40">Read educational PDFs</p>
        </div>
      </div>

      {/* Books Grid - 2 cards per row */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-[3/4] rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="aspect-[3/4] rounded-2xl bg-white/[0.03] animate-pulse" />
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {books.map((book, i) => (
            <BookCard key={book.id || book._id || i} book={book} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Book size={48} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40">No books available right now</p>
        </div>
      )}
    </div>
  )
}
