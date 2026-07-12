import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, Book, AlertTriangle
} from 'lucide-react'
import api from '../../api/axios'
import { useCallback } from 'react'
import PdfReader from '../../components/PdfReader'

// Minimal icon-only back control — no label text, fades with the rest of the UI.
function BackIcon({ onClick, visible = true }) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-3 left-3 z-[60] w-10 h-10 flex items-center justify-center rounded-full
        bg-black/45 backdrop-blur-md text-white transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <ChevronLeft size={22} />
    </button>
  )
}

// PDF stage — full app, landscape-locked like the video stage, native
// pinch-zoom, no third-party toolbar / zoom buttons / "open externally"
function PDFStage({ content, onBack }) {
  return <PdfReader url={content.pdfUrl} title={content.title} onBack={onBack} />
}

export default function BookReader() {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => api.get(`/books/${bookId}`).then(r => r.data),
  })

  const book = data?.book

  const handleBack = useCallback(() => {
    navigate('/books', { replace: true })
  }, [navigate])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !book) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3">
        <AlertTriangle size={32} className="text-gray-500" />
        <p className="text-white/40">Book not found or could not be loaded.</p>
        <BackIcon onClick={handleBack} visible />
      </div>
    )
  }

  return <PDFStage content={book} onBack={handleBack} />
}
