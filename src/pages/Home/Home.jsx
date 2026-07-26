import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
BookOpen, Trophy, TrendingUp, Flame, Play, CheckCircle, ArrowRight, Clock,
Sparkles, ChevronRight, GraduationCap, Compass, Zap, MessageSquare,
ShoppingBag, User, Bell, Book, History, FileText, Brain, RotateCcw,
Calendar, Target, Award, PlayCircle, Star, Activity, ChevronRightCircle
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { useCoursesProgress } from '../../hooks/useCoursesProgress'
import CardThumbnail from '../../components/CardThumbnail'
import { DEFAULT_THUMBNAILS, APP_LOGO_URL } from '../../constants/branding'
import { getRecentQuizzes } from '../../utils/quizCache'
/* ═══ MODERN PULSE SHIMMER ═══ */
function Shimmer({ className = '' }) {
return (
<div className={rounded-[28px] relative overflow-hidden bg-white/[0.02] border border-white/[0.04] ${className}}>
<div
className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
style={{
background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
}}}
/>
</div>
)
}
/* ═══ CIRCULAR PROGRESS ═══ */
function CircularProgress({ percent, size = 120, strokeWidth = 8, color = '#10B981' }) {
const radius = (size - strokeWidth) / 2
const circumference = radius * 2 * Math.PI
const offset = circumference - (percent / 100) * circumference
return (
<div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
<svg className="transform -rotate-90 w-full h-full">
<circle
className="text-white/[0.05]"
strokeWidth={strokeWidth}
stroke="currentColor"
fill="transparent"
r={radius}
cx={size / 2}
cy={size / 2}
/>
<motion.circle
initial={{ strokeDashoffset: circumference }}
animate={{ strokeDashoffset: offset }}
transition={{ duration: 1.5, ease: "easeOut" }}
stroke={color}
strokeWidth={strokeWidth}
strokeDasharray={circumference}
strokeLinecap="round"
fill="transparent"
r={radius}
cx={size / 2}
cy={size / 2}
className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
/>
</svg>
<div className="absolute flex flex-col items-center justify-center">
<span className="text-2xl font-black text-white">{percent}%</span>
<span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Done</span>
</div>
</div>
)
}
/* ═══ PARTICLES BACKGROUND ═══ */
function Particles() {
return (
<div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[28px]">
{[...Array(6)].map((_, i) => (
<motion.div
key={i}
className="absolute w-2 h-2 rounded-full bg-white/20 blur-[1px]"
initial={{
x: Math.random() * 300,
y: Math.random() * 300,
opacity: Math.random() * 0.5 + 0.2,
}}
animate={{
y: [null, Math.random() * -100 - 50],
opacity: [null, 0],
}}
transition={{
duration: Math.random() * 5 + 5,
repeat: Infinity,
ease: "linear",
}}
style={{
left: ${Math.random() * 100}%,
top: ${Math.random() * 100}%,
}}
/>
))}
</div>
)
}
/* ═══ TOP & HERO SECTION ═══ */
function WelcomeHero({ user, isLoading, overall, points, purchases }) {
const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' }
const currentDate = new Date().toLocaleDateString('en-US', dateOptions)
const firstName = user?.name?.split(' ')[0] || 'Scholar'
const progressPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0
const avatarLetter = firstName.charAt(0).toUpperCase()
const currentXP = points?.xp || points?.total || 0
const streak = points?.streak || 0
const rankName = points?.rank || 'Beginner'
if (isLoading) {
return (
<div className="space-y-6 pt-4">
<div className="flex justify-between items-center">
<div className="space-y-2">
<Shimmer className="h-4 w-32"/>
<Shimmer className="h-10 w-48"/>
</div>
<Shimmer className="h-12 w-12 rounded-full"/>
</div>
<Shimmer className="h-64 w-full"/>
</div>
)
}
return (
<div className="space-y-6 pt-4">
{/* Greeting Header */}
<motion.div
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
className="flex items-center justify-between"
>
<div>
<p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-1">{currentDate}</p>
<h1 className="text-3xl font-black text-white leading-tight tracking-tight">
Ready, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B4A] to-[#FF8A65]">{firstName}?</span>
</h1>
</div>
<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FF6B4A] p-[2px] shadow-[0_0_20px_rgba(255,107,74,0.3)]">
<div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center relative overflow-hidden">
{user?.avatar ? (
<img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
) : (
<span className="text-lg font-bold text-white">{avatarLetter}</span>
)}
</div>
</div>
</motion.div>
<motion.p
initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
className="text-sm font-medium text-white/60 italic flex items-center gap-2"
>
<QuoteIcon className="text-[#FF6B4A]" size="{14}"/>
"The beautiful thing about learning is that no one can take it away from you."
</motion.p>
{/* Main Glass Hero Card */}
<motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
className="relative rounded-[28px] p-6 overflow-hidden bg-white/[0.04] border border-white/[0.07] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
>
<div className="absolute top-0 right-0 w-64 h-64 bg-[#8B5CF6]/20 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
<div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF6B4A]/10 rounded-full blur-[80px] pointer-events-none translate-y-1/2 -translate-x-1/2" />
<Particles/>
<div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
<CircularProgress color="#10B981" percent="{progressPercent}" size="{130}"/>
<div className="flex-1 w-full grid grid-cols-2 gap-4">
<HeroStat color="#FF9E0B" icon="{Zap}" label="Total XP" value="{currentXP.toLocaleString()}"/>
<HeroStat Days} color="#FF6B4A" icon="{Flame}" label="Current Streak" value="{${streak}"/>
<HeroStat color="#8B5CF6" icon="{Trophy}" label="Rank" value="{rankName}"/>
<HeroStat color="#10B981" icon="{CheckCircle}" label="Completed" value="{overall.completed}"/>
</div>
</div>
</motion.div>
</div>
)
}
function QuoteIcon(props) {
return (
<svg {...props} viewBox="0 0 24 24" fill="currentColor" stroke="none">
<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
</svg>
)
}
function HeroStat({ label, value, icon: Icon, color }) {
return (
<div className="bg-[#050505]/40 rounded-2xl p-3 border border-white/[0.05] flex items-center gap-3 backdrop-blur-md hover:bg-white/[0.02] transition-colors">
<div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ${color}15, border: 1px solid ${color}30 }}>
<Icon color size="{18}" style="{{" }}/>
</div>
<div>
<p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">{label}</p>
<p className="text-sm font-bold text-white mt-0.5">{value}</p>
</div>
</div>
)
}
/* ═══ CONTINUE LEARNING ═══ */
function ContinueLearningCard({ item, url }) {
if (!item || !url) return null
return (
<div className="space-y-4">
<h2 className="text-sm font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
<PlayCircle className="text-[#8B5CF6]" size="{14}"/> Continue Learning
</h2>
<Link className="block group" to="{url}">
<motion.div
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
className="relative rounded-[28px] overflow-hidden border border-white/[0.07] bg-white/[0.04] aspect-[21/9] md:aspect-[24/7] shadow-lg"
>
<CardThumbnail alt="{item.title}" fallback="{<LogoFallback" item="{item}"/>} />
<div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent opacity-90" />
<div className="absolute inset-0 p-5 flex flex-col justify-end">
<div className="flex items-center gap-3 mb-2">
<span className="px-2.5 py-1 rounded-lg bg-[#8B5CF6] text-white text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(139,92,246,0.4)]">
Up Next
</span>
<span className="text-xs font-medium text-white/60 flex items-center gap-1">
<Clock size="{12}"/> 12 mins left
</span>
</div>
<h3 className="text-lg md:text-xl font-black text-white line-clamp-1 group-hover:text-[#8B5CF6] transition-colors">
{item.title || 'Untitled Lesson'}
</h3>
{/* Play Button Floating */}
<div className="absolute right-5 bottom-5 w-12 h-12 rounded-full bg-white text-[#050505] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-110 group-hover:bg-[#FF6B4A] group-hover:text-white transition-all duration-300 z-10">
<Play className="ml-1" fill="currentColor" size="{20}"/>
</div>
</div>
</motion.div>
</Link>
</div>
)
}
/* ═══ DAILY CHALLENGE ═══ */
function DailyChallenge() {
return (
<motion.div
initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
className="rounded-[28px] bg-gradient-to-br from-[#10B981]/20 to-[#050505] border border-[#10B981]/20 p-5 relative overflow-hidden"
>
<div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2" />
<div className="flex items-start justify-between relative z-10">
<div>
<h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
<Target className="text-[#10B981]" size="{16}"/> Daily Goal
</h3>
<p className="text-xs text-white/60 mb-4">Complete 2 more lessons to hit your daily target.</p>
</div>
<div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981] font-bold text-sm border border-[#10B981]/30">
1/3
</div>
</div>
<div className="h-2 w-full bg-[#050505] rounded-full overflow-hidden border border-white/[0.05] relative z-10">
<motion.div
initial={{ width: 0 }} animate={{ width: '33%' }} transition={{ duration: 1, delay: 0.5 }}
className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399]"
/>
</div>
</motion.div>
)
}
/* ═══ ACHIEVEMENTS ═══ */
function Achievements({ points, overall }) {
const achList = [
{ label: 'Starter', unlocked: true, icon: Star, color: '#F59E0B' },
{ label: 'Consistent', unlocked: (points?.streak || 0) >= 3, icon: Flame, color: '#FF6B4A' },
{ label: 'Scholar', unlocked: overall.completed >= 10, icon: BookOpen, color: '#8B5CF6' },
{ label: 'Master', unlocked: overall.completed >= 50, icon: Award, color: '#10B981' },
]
return (
<div className="space-y-4">
<h2 className="text-sm font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
<Award className="text-[#F59E0B]" size="{14}"/> Achievements
</h2>
<div className="grid grid-cols-4 gap-3">
{achList.map((ach, idx) => (
<motion.div
key={idx}
whileHover={{ y: -2 }}
className={flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border ${ach.unlocked ? 'bg-white/[0.04] border-white/[0.1] shadow-sm' : 'bg-[#050505] border-white/[0.02] opacity-40 grayscale'} transition-all}
>
<div className={w-10 h-10 rounded-full flex items-center justify-center ${ach.unlocked ? '' : 'bg-white/[0.05]'}} style={ach.unlocked ? { background: ${ach.color}20, color: ach.color } : {}}>
<ach.icon size={18} />
</div>
<span className="text-[9px] font-bold text-white tracking-wide uppercase text-center">{ach.label}</span>
</motion.div>
))}
</div>
</div>
)
}
/* ═══ QUICK ACTION CARD ═══ */
function QuickActionCard({ to, icon: Icon, label, description, accent, delay, thumbnailUrl }) {
return (
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
<Link className="block group" to="{to}">
<div className="rounded-[24px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden aspect-[4/3] bg-white/[0.02] border border-white/[0.07] shadow-lg">
{thumbnailUrl && (
<img src={thumbnailUrl} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500 mix-blend-overlay" />
)}
<div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
<div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md" style={{ background: ${accent}20, border: 1px solid ${accent}40 }}>
<Icon accent color: size="{14}" style="{{" }}/>
</div>
<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: radial-gradient(circle at top right, ${accent}20 0%, transparent 70%) }} />
<div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end">
<h3 className="text-sm font-bold text-white mb-0.5">{label}</h3>
<div className="flex items-center justify-between">
<p className="text-[10px] text-white/50">{description}</p>
<div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.1] group-hover:bg-white text-white group-hover:text-[#050505] transition-colors">
<ArrowRight size="{12}"/>
</div>
</div>
</div>
</div>
</Link>
</motion.div>
)
}
function LogoFallback({ className = '' }) {
return (
<div className={absolute inset-0 flex items-center justify-center bg-[#0A0A0A] ${className}}>
<img src={APP_LOGO_URL} alt="" className="w-1/3 h-1/3 object-contain opacity-20 filter grayscale" />
</div>
)
}
/* ═══ NETFLIX STYLE WATCH HISTORY CARD ═══ */
function WatchHistoryCard({ item, index }) {
const itemUrl = item.courseId && item.subjectId && item.contentId
? /courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}
: item.courseId && item.subjectId
? /courses/${item.courseId}/subjects/${item.subjectId}
: '#'
return (
<motion.div
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
className="min-w-[260px] w-[260px] flex-shrink-0"
>
<Link className="block group" to="{itemUrl}">
<div className="rounded-[20px] overflow-hidden transition-all duration-300 relative aspect-[16/9] border border-white/[0.05] bg-white/[0.02]">
<CardThumbnail alt="{item.title}" fallback="{<LogoFallback" item="{item}"/>} />
<div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
<div className="absolute bottom-0 left-0 right-0 p-3">
<h4 className="text-xs font-bold text-white line-clamp-1 mb-1">
{item.title || 'Untitled Lesson'}
</h4>
<div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
<div className="h-full bg-[#EF4444]" style={{ width: '45%' }} />
</div>
</div>
<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
<div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center bg-white/20">
<Play className="ml-1" fill="white" size="{16}"/>
</div>
</div>
</div>
</Link>
</motion.div>
)
}
/* ═══ PDF NOTES CARD ═══ */
function PdfCard({ item, index }) {
const itemUrl = item.courseId && item.subjectId && item.contentId
? /courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}
: '#'
return (
<motion.div
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
className="min-w-[140px] w-[140px] flex-shrink-0"
>
<Link className="block group" to="{itemUrl}">
<div className="rounded-[16px] overflow-hidden transition-all duration-300 relative aspect-[3/4] border border-[#3B82F6]/20 bg-gradient-to-b from-[#3B82F6]/5 to-[#050505]">
<div className="absolute top-2 right-2 bg-[#EF4444] text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shadow-md z-10">PDF</div>
<CardThumbnail alt="{item.title}" fallback="{<LogoFallback" item="{item}"/>} className="opacity-60 mix-blend-luminosity group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" />
<div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
<div className="absolute inset-x-0 bottom-0 p-3">
<div className="w-6 h-6 rounded-md bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center mb-2">
<FileText className="text-[#3B82F6]" size="{12}"/>
</div>
<p className="text-xs font-bold text-white line-clamp-2 leading-tight">
{item.title || 'Notes Document'}
</p>
</div>
</div>
</Link>
</motion.div>
)
}
/* ═══ QUIZ HISTORY CARD ═══ */
function QuizHistoryCard({ entry, index }) {
const latest = entry.attempts[0]
const attemptsCount = entry.attempts.length
const score = Math.round(latest.score)
const scoreColor = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
return (
<motion.div
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
className="min-w-[200px] w-[200px] flex-shrink-0"
>
<Link className="block group" to="{`/quiz/result/${latest.attemptId}`}">
<div className="rounded-[20px] p-4 transition-all duration-300 relative border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] flex flex-col gap-3">
<div className="flex justify-between items-start">
<div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6]">
<Brain size="{14}"/>
</div>
<div className="flex flex-col items-end">
<span className="text-lg font-black" style={{ color: scoreColor }}>{score}%</span>
<span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Score</span>
</div>
</div>
<div>
<h4 className="text-xs font-bold text-white line-clamp-1 mb-1 group-hover:text-[#8B5CF6] transition-colors">{entry.quizName}</h4>
<div className="flex items-center justify-between mt-2">
<span className="text-[10px] text-white/50 bg-white/[0.05] px-2 py-0.5 rounded-full flex items-center gap-1">
<RotateCcw size="{10}"/> {attemptsCount} try
</span>
<ChevronRightCircle className="text-white/20 group-hover:text-[#8B5CF6] transition-colors" size="{14}"/>
</div>
</div>
</div>
</Link>
</motion.div>
)
}
/* ═══ SCROLL ROW ═══ */
function ScrollRow({ icon: Icon, title, count, seeAllTo, children }) {
return (
<div className="space-y-3">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
<Icon className="text-[#FF6B4A]" size="{16}"/> {title} {count > 0 && <span className="bg-white/[0.05] text-white/50 px-1.5 py-0.5 rounded-md text-[10px]">{count}</span>}
</h3>
{seeAllTo && (
<Link className="text-xs font-bold text-[#FF6B4A] hover:text-[#FF8A65] flex items-center gap-1 transition-colors bg-[#FF6B4A]/10 px-2 py-1 rounded-full" to="{seeAllTo}">
See All <ChevronRight size="{12}"/>
</Link>
)}
</div>
<div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
{children}
</div>
</div>
)
}
/* ═══ MAIN HOME COMPONENT ═══ */
export default function Home() {
const user = useAuthStore(s => s.user)
const [recentlyWatched, setRecentlyWatched] = useState([])
const [recentQuizzes, setRecentQuizzes] = useState([])
useEffect(() => {
try {
const stored = JSON.parse(localStorage.getItem('ar_recently_watched') || '[]')
setRecentlyWatched(stored)
} catch (e) {
console.error('Error loading recently watched:', e)
}
try {
setRecentQuizzes(getRecentQuizzes(20))
} catch (e) {
console.error('Error loading quiz history:', e)
}
}, [])
const classItems = recentlyWatched.filter(item => item.type !== 'pdf')
const notesItems = recentlyWatched.filter(item => item.type === 'pdf')
const { data: pointsData, isLoading: pointsLoading } = useQuery({
queryKey: ['my-points'],
queryFn: () => api.get('/my-points').then(r => r.data),
})
const { data: lastWatchedData } = useQuery({
queryKey: ['user-last-watched'],
queryFn: () => api.get('/user/progress').then(r => r.data),
})
const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
queryKey: ['purchases'],
queryFn: () => api.get('/store/my-purchases').then(r => r.data),
staleTime: 5 * 60 * 1000,
gcTime: 24 * 60 * 60 * 1000,
})
const points = pointsData?.points || {}
const lastWatched = lastWatchedData?.progress || {}
const purchases = purchasesData?.purchases || []
const courseIds = purchases.map(p => p.courseId).filter(Boolean)
const { overall } = useCoursesProgress(courseIds)
const lastContentId = lastWatched.lastContentId
const lastSubjectId = lastWatched.lastContentSubjectId
const lastCourseId = lastWatched.lastContentCourseId
const { data: lastContentData, isLoading: contentLoading } = useQuery({
queryKey: ['last-content-detail', lastContentId],
queryFn: () => api.get(/content/${lastContentId}${lastSubjectId ? ?subjectId=${lastSubjectId} : ''}).then(r => r.data),
enabled: !!lastContentId && recentlyWatched.length === 0,
staleTime: 60000,
})
const lastContent = lastContentData?.content
const continueUrl = lastContentId && lastCourseId && lastSubjectId
? /courses/${lastCourseId}/subjects/${lastSubjectId}/content/${lastContentId}
: lastSubjectId && lastCourseId
? /courses/${lastCourseId}/subjects/${lastSubjectId}
: null
const isLoading = pointsLoading || purchasesLoading
const continueItem = lastContent || classItems[0]
const finalContinueUrl = continueUrl || (classItems[0] ? /courses/${classItems[0].courseId}/subjects/${classItems[0].subjectId}/content/${classItems[0].contentId} : null)
const staticCards = [
{ to: '/free-courses', icon: BookOpen, label: 'Free', description: 'Start learning', accent: '#10B981', delay: 0.1, thumbnailUrl: DEFAULT_THUMBNAILS.freeCourses },
{ to: '/books', icon: Book, label: 'Books', description: 'Read PDFs', accent: '#3B82F6', delay: 0.15, thumbnailUrl: DEFAULT_THUMBNAILS.books },
{ to: '/store', icon: ShoppingBag, label: 'Store', description: 'Premium', accent: '#FF6B4A', delay: 0.2, thumbnailUrl: DEFAULT_THUMBNAILS.store },
{ to: '/progress', icon: Activity, label: 'Progress', description: 'Your stats', accent: '#8B5CF6', delay: 0.25, thumbnailUrl: DEFAULT_THUMBNAILS.progress },
]
return (
<div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF6B4A]/30 overflow-x-hidden">
<div className="max-w-3xl mx-auto px-4 pb-20 space-y-10">
<WelcomeHero isLoading="{isLoading}" overall="{overall}" points="{points}" purchases="{purchases}" user="{user}"/>
{continueItem && finalContinueUrl && (
<ContinueLearningCard item="{continueItem}" url="{finalContinueUrl}"/>
)}
<DailyChallenge/>
<div className="grid grid-cols-2 gap-4">
{staticCards.map((card, i) => (
<QuickActionCard key="{i}" {...card}/>
))}
</div>
<Achievements overall="{overall}" points="{points}"/>
{classItems.length > 0 && (
<ScrollRow count="{classItems.length}" icon="{History}" seeAllTo="/watch-history" title="Watch History">
{classItems.map((item, idx) => (
<WatchHistoryCard idx} index="{idx}" item="{item}" key="{item.contentId" ||/>
))}
</ScrollRow>
)}
{notesItems.length > 0 && (
<ScrollRow count="{notesItems.length}" icon="{FileText}" seeAllTo="/watch-history" title="Recent Notes">
{notesItems.map((item, idx) => (
<PdfCard idx} index="{idx}" item="{item}" key="{item.contentId" ||/>
))}
</ScrollRow>
)}
{recentQuizzes.length > 0 && (
<ScrollRow count="{recentQuizzes.length}" icon="{Brain}" title="Quiz History">
{recentQuizzes.map((entry, idx) => (
<QuizHistoryCard entry="{entry}" index="{idx}" key="{`${entry.subject}::${entry.quizName}`}"/>
))}
</ScrollRow>
)}
<style>{.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }}</style>
</div>
</div>
)
}
  const firstName = user?.name?.split(' ')[0] || 'Student'

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-10 w-64" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative pt-2"
    >
      {/* Subtle colorful background radial wash */}
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-0 right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/50 border border-white/[0.05] flex items-center gap-1.5">
          <Sparkles size={10} className="text-primary-400" />
          {greeting}
        </span>
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight mb-2">
        Hey, <span style={{
          background: 'linear-gradient(135deg, #FF9270 0%, #FF6B4A 50%, #FF85A2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>{firstName}</span> <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
      </h1>
      <p className="text-xs text-white/50 font-medium max-w-md">
        Welcome back to your dashboard. Ready to conquer your learning goals today?
      </p>
    </motion.div>
  )
}

/* ═══ QUICK ACTION CARD ═══ */
function QuickActionCard({ to, icon: Icon, label, description, accent, delay, thumbnailUrl }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} className="block group">
        <div
          className="rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden aspect-square"
          style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {/* Thumbnail fills the entire card */}
          {thumbnailUrl && (
            <img src={thumbnailUrl} alt={label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          )}
          {/* Gradient + hover glow so the text stays readable over the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: `radial-gradient(circle at center, ${accent}15 0%, transparent 70%)` }} />

          {/* Text pinned to the bottom, over the image */}
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white mb-0.5 drop-shadow-md truncate">{label}</h3>
              <p className="text-[9px] text-white/60 truncate">{description}</p>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:translate-x-0.5 backdrop-blur-sm"
              style={{ background: `${accent}25`, border: `1px solid ${accent}40` }}>
              <ArrowRight size={12} style={{ color: accent }} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// Icon mapping for dynamic cards
const iconMap = {
  BookOpen,
  Book,
  GraduationCap,
  ShoppingBag,
  MessageSquare,
}

/* ═══ LOGO FALLBACK (shown when a card has no real thumbnail) ═══ */
function LogoFallback({ className = '' }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ background: 'linear-gradient(135deg, #10142A 0%, #151932 100%)' }}>
      <img src={APP_LOGO_URL} alt="" className="w-1/2 h-1/2 object-contain opacity-40" />
    </div>
  )
}

/* ═══ WATCH HISTORY CARD ═══ */
function WatchHistoryCard({ item, index }) {
  const itemUrl = item.courseId && item.subjectId && item.contentId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}/content/${item.contentId}`
    : item.courseId && item.subjectId
    ? `/courses/${item.courseId}/subjects/${item.subjectId}`
    : '#'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
    >
      <Link to={itemUrl} className="block group">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 relative aspect-square"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.08) 0%, rgba(255, 107, 74, 0.02) 100%)',
            border: '1px solid rgba(255, 107, 74, 0.18)',
          }}
        >
          {/* Thumbnail fills the entire card */}
          <CardThumbnail
            item={item}
            alt={item.title}
            fallback={<LogoFallback />}
          />
          
          {/* Text overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-xs font-bold text-white text-center line-clamp-1">
              {item.title || 'Untitled Lesson'}
            </p>
            <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5"
              style={{
                background: item.type === 'pdf' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 107, 74, 0.8)',
                color: 'white',
              }}>
              {item.type === 'pdf' ? 'PDF' : 'Video'}
            </span>
          </div>
          
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Play size={14} fill="white" color="white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ HORIZONTAL SCROLL ROW (no visible scrollbar) ═══ */
function ScrollRow({ icon: Icon, title, count, seeAllTo, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Icon size={12} className="text-primary-400" />
          {title} {count > 0 && `(${count})`}
        </h3>
        {seeAllTo && (
          <Link to={seeAllTo}
            className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
            See All
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollSnapType: 'x proximity' }}>
        {children}
      </div>
    </div>
  )
}

/* ═══ QUIZ HISTORY CARD (recent activity → latest attempt for that quiz) ═══ */
function QuizHistoryCard({ entry, index }) {
  const latest = entry.attempts[0]
  const attemptsCount = entry.attempts.length
  const score = Math.round(latest.score)
  const scoreColor = score >= 75 ? '#2DD4BF' : score >= 50 ? '#FFB020' : '#FF5C5C'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
      className="min-w-[160px] w-[160px] flex-shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link to={`/quiz/result/${latest.attemptId}`} className="block group">
        <div className="rounded-2xl overflow-hidden transition-all duration-300 relative aspect-square flex flex-col justify-between p-3"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0.03) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          {/* Logo watermark — quizzes have no real thumbnail */}
          <img src={APP_LOGO_URL} alt="" className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain opacity-[0.08] pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Brain size={15} className="text-violet-300" />
            </div>
            <div className="text-right">
              <div className="text-lg font-black" style={{ color: scoreColor }}>{score}%</div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1">
              {entry.quizName}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/25 text-violet-200">
                {attemptsCount} attempt{attemptsCount > 1 ? 's' : ''}
              </span>
              <RotateCcw size={11} className="text-white/30 group-hover:text-violet-300 transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══ MAIN HOME VIEW ═══ */
export default function Home() {
  const user = useAuthStore(s => s.user)
  const [recentlyWatched, setRecentlyWatched] = useState([])
  const [recentQuizzes, setRecentQuizzes] = useState([])

  // Load recently watched items + quiz attempt history from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ar_recently_watched') || '[]')
      setRecentlyWatched(stored)
    } catch (e) {
      console.error('Error loading recently watched:', e)
    }
    try {
      setRecentQuizzes(getRecentQuizzes(20))
    } catch (e) {
      console.error('Error loading quiz history:', e)
    }
  }, [])

  const classItems = recentlyWatched.filter(item => item.type !== 'pdf')
  const notesItems = recentlyWatched.filter(item => item.type === 'pdf')

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['my-points'],
    queryFn: () => api.get('/my-points').then(r => r.data),
  })

  const { data: lastWatchedData } = useQuery({
    queryKey: ['user-last-watched'],
    queryFn: () => api.get('/user/progress').then(r => r.data),
  })

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/store/my-purchases').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const points = pointsData?.points || {}
  const lastWatched = lastWatchedData?.progress || {}
  const purchases = purchasesData?.purchases || []

  // Overall "% complete" — computed locally from cached subject structure +
  // local completion state, same source every page in the app agrees on.
  const courseIds = purchases.map(p => p.courseId).filter(Boolean)
  const { overall } = useCoursesProgress(courseIds)

  const lastContentId = lastWatched.lastContentId
  const lastSubjectId = lastWatched.lastContentSubjectId
  const lastCourseId = lastWatched.lastContentCourseId

  const { data: lastContentData, isLoading: contentLoading } = useQuery({
    queryKey: ['last-content-detail', lastContentId],
    queryFn: () =>
      api.get(`/content/${lastContentId}${lastSubjectId ? `?subjectId=${lastSubjectId}` : ''}`).then(r => r.data),
    enabled: !!lastContentId && recentlyWatched.length === 0,
    staleTime: 60000,
  })

  const lastContent = lastContentData?.content

  const continueUrl =
    lastContentId && lastCourseId && lastSubjectId
      ? `/courses/${lastCourseId}/subjects/${lastSubjectId}/content/${lastContentId}`
      : lastSubjectId && lastCourseId
      ? `/courses/${lastCourseId}/subjects/${lastSubjectId}`
      : null

  const isLoading = pointsLoading || purchasesLoading

  // Static cards with thumbnail support
  const staticCards = [
    { to: '/free-courses', icon: BookOpen, label: 'Free Courses', description: 'Start learning free', accent: '#10B981', delay: 0.12, thumbnailUrl: DEFAULT_THUMBNAILS.freeCourses },
    { to: '/books', icon: Book, label: 'Books', description: 'Read PDFs', accent: '#6366F1', delay: 0.18, thumbnailUrl: DEFAULT_THUMBNAILS.books },
    { to: '/store', icon: ShoppingBag, label: 'Store', description: 'Premium courses', accent: '#FF6B4A', delay: 0.24, thumbnailUrl: DEFAULT_THUMBNAILS.store },
  ]

  // Progress card data
  const progressPercent = overall.total > 0 ? Math.round((overall.completed / overall.total) * 100) : 0
  const progressCard = {
    to: '/progress',
    icon: TrendingUp,
    label: 'Progress',
    description: `${progressPercent}% Complete`,
    accent: '#10B981',
    delay: 0.36,
    thumbnailUrl: DEFAULT_THUMBNAILS.progress,
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">

      {/* ── CLEAN WELCOME HERO ── */}
      <WelcomeHero user={user} isLoading={isLoading} />

      {/* ── QUICK ACTION CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        {staticCards.map((card, i) => (
          <QuickActionCard key={i} {...card} />
        ))}
        <QuickActionCard {...progressCard} />
      </div>

      {/* ── CLASS (recent videos) ── */}
      {classItems.length > 0 && (
        <ScrollRow icon={History} title="Class" count={classItems.length} seeAllTo="/watch-history">
          {classItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {/* ── NOTES (recent PDFs) ── */}
      {notesItems.length > 0 && (
        <ScrollRow icon={FileText} title="Notes" count={notesItems.length} seeAllTo="/watch-history">
          {notesItems.map((item, idx) => (
            <WatchHistoryCard key={item.contentId || idx} item={item} index={idx} />
          ))}
        </ScrollRow>
      )}

      {/* ── QUIZ (recent attempts, one card per quiz — latest attempt shown) ── */}
      {recentQuizzes.length > 0 && (
        <ScrollRow icon={Brain} title="Quiz" count={recentQuizzes.length}>
          {recentQuizzes.map((entry, idx) => (
            <QuizHistoryCard key={`${entry.subject}::${entry.quizName}`} entry={entry} index={idx} />
          ))}
        </ScrollRow>
      )}

      {/* Inline styles for custom wave animation and shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes wave {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
          transform-origin: 70% 70%;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
