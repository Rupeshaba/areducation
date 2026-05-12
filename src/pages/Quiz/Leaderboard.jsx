import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Trophy, Crown, Medal, Star, Flame, TrendingUp,
  Zap, Award, ChevronUp, Target, Sparkles, Calendar
} from 'lucide-react'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

const PERIODS = [
  { key: 'allTime', label: 'All Time', icon: Trophy },
  { key: 'monthly', label: 'Monthly', icon: Calendar },
  { key: 'weekly', label: 'Weekly', icon: TrendingUp },
  { key: 'daily', label: 'Today', icon: Flame },
]

/* ─── Shimmer Components ─── */
function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }} />
  )
}

function ShimmerRow() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
      <Shimmer className="w-8 h-8 rounded-lg" />
      <Shimmer className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-32 rounded" />
      </div>
      <Shimmer className="h-4 w-16 rounded" />
    </div>
  )
}

function ShimmerPodium() {
  return (
    <div className="flex items-end justify-center gap-3 mb-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex flex-col items-center">
          <Shimmer className={`w-16 rounded-t-xl ${i === 2 ? 'h-24' : i === 1 ? 'h-32' : 'h-20'}`} />
          <Shimmer className="w-16 h-4 rounded-b-lg mt-1" />
        </div>
      ))}
    </div>
  )
}

/* ─── Top 3 Podium Card ─── */
function PodiumCard({ entry, position, delay }) {
  if (!entry) return null

  const heights = ['h-28', 'h-40', 'h-32']
  const positions = ['order-2', 'order-1', 'order-3']
  const gradients = [
    'from-gray-400/20 to-gray-500/5 border-gray-400/30',
    'from-amber-500/25 to-yellow-500/10 border-amber-500/40',
    'from-orange-700/20 to-orange-800/5 border-orange-600/30'
  ]
  const badges = ['🥈', '🥇', '🥉']
  const textColors = ['text-gray-300', 'text-amber-400', 'text-orange-400']
  const iconSizes = ['w-14 h-14', 'w-18 h-18', 'w-14 h-14']
  const crownSizes = ['top-[-10px]', 'top-[-16px]', 'top-[-10px]']

  const idx = position - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center ${positions[idx]}`}
    >
      {/* Crown for #1 */}
      {position === 1 && (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-2"
        >
          <Crown size={28} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
        </motion.div>
      )}

      {/* Avatar */}
      <div className={`relative ${iconSizes[idx]} mb-3`}>
        {entry.avatarUrl ? (
          <img src={entry.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover border-2 border-white/20 shadow-xl" />
        ) : (
          <div className={`w-full h-full rounded-2xl flex items-center justify-center text-xl font-black bg-gradient-to-br ${gradients[idx]} border-2 ${textColors[idx]}`}>
            {(entry.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className={`absolute ${crownSizes[idx]} left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0a0a1a] border border-white/10 flex items-center justify-center text-sm shadow-lg`}>
          {badges[idx]}
        </div>
      </div>

      {/* Name */}
      <div className={`font-bold text-sm text-center mb-1 ${textColors[idx]} max-w-[100px] truncate`}>
        {entry.name || 'Unknown'}
      </div>

      {/* Points */}
      <div className="text-xs text-gray-500 font-medium mb-3">{entry.points.toLocaleString()} pts</div>

      {/* Podium Bar */}
      <div className={`w-20 sm:w-24 ${heights[idx]} rounded-t-2xl bg-gradient-to-b ${gradients[idx]} border-t border-x flex items-end justify-center pb-3 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent" />
        <span className={`text-2xl font-black ${textColors[idx]} relative z-10`}>#{position}</span>
      </div>
    </motion.div>
  )
}

/* ─── List Row ─── */
function ListRow({ entry, index, isMe }) {
  const rankStyle = index < 3 ? {
    0: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', badge: '🥇' },
    1: { bg: 'bg-gray-400/5', border: 'border-gray-400/20', text: 'text-gray-300', badge: '🥈' },
    2: { bg: 'bg-orange-700/5', border: 'border-orange-600/20', text: 'text-orange-400', badge: '🥉' },
  }[index] : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
        isMe
          ? 'border-primary-500/40 bg-primary-500/5 shadow-lg shadow-primary-500/10'
          : rankStyle
          ? `${rankStyle.bg} ${rankStyle.border}`
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
        {/* Rank */}
        <div className="w-10 text-center flex-shrink-0">
          {rankStyle ? (
            <span className="text-xl">{rankStyle.badge}</span>
          ) : (
            <span className="text-gray-600 font-bold text-sm">#{entry.rank}</span>
          )}
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
              isMe ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-white/[0.05] text-gray-400 border border-white/[0.08]'
            }`}>
              {(entry.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate flex items-center gap-2 ${
            isMe ? 'text-primary-300' : rankStyle ? rankStyle.text : 'text-white'
          }`}>
            {entry.name || 'Unknown'}
            {isMe && (
              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
            <Zap size={10} className={isMe ? 'text-primary-500/50' : 'text-gray-700'} />
            <span>Level {Math.floor((entry.points || 0) / 1000) + 1}</span>
          </div>
        </div>

        {/* Points */}
        <div className="flex-shrink-0 text-right">
          <div className={`font-black text-base ${isMe ? 'text-primary-400' : rankStyle ? rankStyle.text : 'text-white'}`}>
            {entry.points.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">points</div>
        </div>
      </div>

      {/* Shine effect for top 3 */}
      {rankStyle && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer pointer-events-none" />
      )}
    </motion.div>
  )
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('allTime')
  const user = useAuthStore(s => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => api.get(`/leaderboard?period=${period}`).then(r => r.data),
    refetchInterval: 60000,
  })

  const leaderboard = data?.leaderboard || []
  const myEntry = leaderboard.find(e => e.userId === user?.uid)
  const myRank = myEntry?.rank

  const topThree = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  return (
    <div className="max-w-2xl mx-auto">
      
      {/* ═══ HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent border border-amber-500/20 p-6 sm:p-8 mb-8"
      >
        <div className="absolute top-[-30%] right-[-10%] w-48 h-48 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-orange-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/25 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Trophy size={32} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Leaderboard</h1>
            <p className="text-gray-400 text-sm">Compete with the best. Climb to the top.</p>
          </div>
        </div>

        {myRank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]"
          >
            <div className="flex items-center gap-1.5">
              <Target size={14} className="text-primary-400" />
              <span className="text-gray-400 text-sm">Your Rank</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <span className="font-black text-xl text-amber-400">#{myRank}</span>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-white">{myEntry?.points?.toLocaleString() || 0}</span>
              <span className="text-xs text-gray-500">pts</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ═══ PERIOD TABS ═══ */}
      <div className="relative mb-8">
        <div className="flex bg-white/[0.03] rounded-2xl p-1.5 border border-white/[0.08]">
          {PERIODS.map(p => {
            const Icon = p.icon
            const isActive = period === p.key
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/25"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={14} />
                  {p.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ LOADING ═══ */}
      {isLoading ? (
        <div className="space-y-3">
          <ShimmerPodium />
          <ShimmerRow />
          <ShimmerRow />
          <ShimmerRow />
          <ShimmerRow />
          <ShimmerRow />
        </div>
      ) : leaderboard.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
            <Trophy size={36} className="text-gray-600" />
          </div>
          <p className="text-gray-500 font-medium">No data yet for this period.</p>
          <p className="text-gray-600 text-sm mt-1">Be the first to make the leaderboard!</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          
          {/* ═══ TOP 3 PODIUM ═══ */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-5 pb-2">
              {topThree.map((entry, i) => (
                <PodiumCard key={entry.userId} entry={entry} position={i + 1} delay={i * 0.15} />
              ))}
            </div>
          )}

          {/* ═══ REST OF LIST ═══ */}
          {rest.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-xs text-gray-600 font-medium uppercase tracking-widest">Rankings</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              
              {rest.map((entry, i) => (
                <ListRow
                  key={entry.userId}
                  entry={entry}
                  index={i + 3}
                  isMe={entry.userId === user?.uid}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}