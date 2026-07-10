import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BookOpen, Users, Trophy, Target, ShieldCheck,
  Brain, Instagram, MessageCircle, Phone,
  GraduationCap, Zap, Star, ChevronRight,
  Play, FileText, ClipboardList, TrendingUp,
  Quote, Award, ArrowUpRight, Sparkles, Flame
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { APP_LOGO_URL } from '../../constants/branding'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
})

const stats = [
  { icon: BookOpen,  value: '100+', label: 'Courses',        color: 'text-sky-400',    border: 'border-sky-500/20',    bg: 'bg-sky-500/10'     },
  { icon: Users,     value: '10K+', label: 'Students',       color: 'text-emerald-400',border: 'border-emerald-500/20',bg: 'bg-emerald-500/10' },
  { icon: Trophy,    value: '500+', label: 'Mock Tests',     color: 'text-amber-400',  border: 'border-amber-500/20',  bg: 'bg-amber-500/10'   },
  { icon: TrendingUp,value: '95%',  label: 'Success Rate',   color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/10'  },
]

const features = [
  {
    icon: Brain,
    title: 'Smart Quizzes',
    desc: 'Subject-wise quizzes with instant scoring, leaderboard ranking, and detailed performance tracking.',
    color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
  },
  {
    icon: Play,
    title: 'Video Lectures',
    desc: 'High-quality video lessons from expert teachers covering every topic for your exam preparation.',
    color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
  },
  {
    icon: FileText,
    title: 'PDF Notes',
    desc: 'Structured study material, handwritten notes and PDFs accessible anytime, anywhere.',
    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
  },
  {
    icon: Target,
    title: 'Exam Focused',
    desc: 'SSC, UPSC, Railway, State PCS, Banking and more — all competitive exams covered under one roof.',
    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    desc: 'Visual progress tracking, points system, and leaderboards to keep you motivated daily.',
    color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted Platform',
    desc: 'Simple, fast, and student-friendly. Built for serious aspirants who mean business.',
    color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20',
  },
]

const testimonials = [
  { name: 'Rahul Sharma', role: 'SSC CGL Aspirant', text: 'Mock tests are at par with actual exam. Score improved 40% in 2 months.', rating: 5 },
  { name: 'Priya Patel', role: 'UPSC Qualified', text: 'PDF notes saved hundreds of hours. Perfectly structured for revision.', rating: 5 },
  { name: 'Amit Kumar', role: 'Railway Selected', text: 'Video lectures are crisp and to-the-point. No fluff, only what matters.', rating: 5 },
]

export default function About() {
  const { data: logoData } = useQuery({
    queryKey: ['app-config-public'],
    queryFn: () => api.get('/public/logo').then(r => r.data).catch(() => ({})),
    staleTime: 300000,
  })

  const { data } = useQuery({
    queryKey: ['social-links'],
    queryFn: () => api.get('/admin/social-links').then(r => r.data).catch(() => ({})),
    staleTime: 300000,
  })

  const aboutText = data?.aboutUs ||
    `AR Education is a modern learning platform built for ambitious students preparing for competitive exams across India.\n\nWe combine quality video lectures, smart quizzes, structured notes, and PDFs to help you study more effectively and score higher.\n\nOur goal is simple — affordable, high-quality education for every aspiring student.`

  const socialLinks = [
    { label: 'Instagram', icon: Instagram, href: data?.instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    { label: 'Telegram',  icon: MessageCircle, href: data?.telegram, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { label: 'WhatsApp',  icon: Phone, href: data?.whatsapp ? `https://wa.me/${data.whatsapp}` : null, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ].filter(l => l.href)

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12 px-4">

      {/* ── HERO ── */}
      <motion.div {...fadeUp(0)}
        className="relative overflow-hidden rounded-3xl border border-primary-500/20 p-8 sm:p-12"
        style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0f0f1e 60%, #0a1628 100%)' }}>

        {/* Animated bg orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 bg-violet-600/15 rounded-full blur-[80px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[60%] w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] animate-pulse delay-2000" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-10">
          {/* Logo + brand */}
          <div className="flex-shrink-0 text-center sm:text-left">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-primary-500/30 shadow-2xl shadow-primary-500/20 mx-auto sm:mx-0 mb-5 hover:scale-105 transition-transform duration-300">
              {(logoData?.logoUrl || APP_LOGO_URL)
                ? <img src={logoData?.logoUrl || APP_LOGO_URL} alt="AR Education" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary-600 via-violet-600 to-primary-800 flex items-center justify-center text-3xl font-black text-white">AR</div>
              }
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/25 text-primary-300 text-xs font-bold uppercase tracking-widest mb-3">
              <Star size={12} className="fill-primary-400 text-primary-400" />
              India's #1 Exam Prep
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-2">
              AR <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">Education</span>
            </h1>
            <p className="text-gray-400 text-base">Empowering Future Achievers</p>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-5 justify-center sm:justify-start">
                {socialLinks.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center ${s.color} hover:scale-110 transition-transform`}>
                    <s.icon size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* About text */}
          <div className="flex-1 backdrop-blur-xl bg-white/[0.03] rounded-2xl p-6 border border-white/[0.08]">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-primary-400" /> About Us
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{aboutText}</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="relative z-10 flex flex-wrap gap-3 mt-8">
          <Link to="/store"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary-500/25">
            Browse Courses <ChevronRight size={16} />
          </Link>
          <Link to="/my-courses"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 text-sm font-bold transition-all">
            My Courses
          </Link>
        </div>
      </motion.div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp(0.05 + i * 0.08)}
            className={`backdrop-blur-xl bg-white/[0.03] rounded-2xl border ${s.border} p-5 text-center hover:scale-[1.03] hover:bg-white/[0.05] transition-all duration-300`}>
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── WHY US ── */}
      <motion.div {...fadeUp(0.15)}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Zap size={14} className="text-amber-400" />
            Why Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
            Everything You Need to <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">Succeed</span>
          </h2>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            A complete ecosystem designed by toppers, for future toppers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title} {...fadeUp(0.2 + i * 0.07)}
              className={`backdrop-blur-xl bg-white/[0.03] rounded-2xl border ${f.border} p-6 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300 group`}>
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── TESTIMONIALS ── */}
      <motion.div {...fadeUp(0.2)}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Award size={14} className="text-amber-400" />
            Success Stories
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Trusted by <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">10,000+ Students</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} {...fadeUp(0.25 + i * 0.1)}
              className="backdrop-blur-xl bg-white/[0.03] rounded-2xl border border-white/[0.08] p-6 hover:bg-white/[0.05] transition-all duration-300">
              <Quote size={24} className="text-primary-500/30 mb-4" />
              <p className="text-gray-300 text-sm leading-relaxed mb-6">{t.text}</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-semibold">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── BOTTOM CTA ── */}
      <motion.div {...fadeUp(0.3)}
        className="relative overflow-hidden rounded-3xl border border-primary-500/20 p-10 sm:p-14 text-center"
        style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0f0f1e 100%)' }}>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-5">
            <Zap size={28} className="text-primary-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Your Success Journey Starts Here 🚀
          </h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Join thousands of students preparing smarter every day with AR Education.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/store"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-bold transition-all active:scale-95 shadow-xl shadow-primary-500/25">
              Explore Courses
            </Link>
            {socialLinks[0] && (() => {
              const SocialIcon = socialLinks[0].icon
              return (
                <a href={socialLinks[0].href} target="_blank" rel="noopener noreferrer"
                  className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 text-sm font-bold transition-all flex items-center gap-2">
                  <SocialIcon size={16} /> Follow Us
                </a>
              )
            })()}
          </div>
          
          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Users size={14} className="text-sky-500" />
              <span>10K+ Students</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Award size={14} className="text-amber-500" />
              <span>Top Rated</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
