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
    <div className={`animate-pulse bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02] bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.8s infinite' }} />
  )
}

function ShimmerRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
      <Shimmer className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-32 rounded" />
        <Shimmer className="h-3 w-24 rounded" />
      </div>
      <Shimmer className="h-6 w-16 rounded" />
    </div>
  )
}

function ShimmerPodium() {
  return (
    <div className="flex items-end justify-center gap-6 mb-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex flex-col items-center">
          <Shimmer className={`w-16 rounded-t-2xl ${i === 2 ? 'h-24' : i === 1 ? 'h-32' : 'h-20'}`} />
          <Shimmer className="w-16 h-4 rounded-b-2xl mt-2" />
        </div>
      ))}
    </div>
  )
}

/* ─── Top 3 Podium Card ─── */
function PodiumCard({ entry, position, delay }) {
  if (!entry) return null

  const heights = ['h-32 sm:h-44', 'h-28 sm:h-36', 'h-20 sm:h-28']
  const positions = ['order-2', 'order-1', 'order-3']
  const gradients = [
    'from-amber-400/30 to-yellow-500/20 border-amber-400/60 shadow-amber-400/20',
    'from-slate-300/20 to-gray-400/10 border-slate-300/40 shadow-slate-300/10',
    'from-orange-500/20 to-orange-600/10 border-orange-400/30 shadow-orange-400/10'
  ]
  const badges = ['🥇', '🥈', '🥉']
  const textColors = ['text-amber-300', 'text-gray-200', 'text-orange-300']
  const avatarSizes = ['w-16 h-16 sm:w-20 sm:h-20', 'w-14 h-14 sm:w-16 sm:h-16', 'w-14 h-14 sm:w-16 sm:h-16']
  const badgeColors = [
    'bg-amber-400/20 border-amber-400/50 text-amber-300',
    'bg-slate-300/20 border-slate-300/50 text-gray-200',
    'bg-orange-400/20 border-orange-400/50 text-orange-300'
  ]

  const idx = position - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center ${positions[idx]}`}
    >
      {/* Crown for #1 with glow */}
      {position === 1 && (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="mb-2"
        >
          <Crown size={32} className="text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
        </motion.div>
      )}

      {/* Avatar container with rank badge above */}
      <div className="relative flex flex-col items-center">
        {/* Rank badge – positioned above the avatar, never covering the face */}
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-sm border backdrop-blur-sm shadow-lg ${badgeColors[idx]}`}>
          {badges[idx]}
        </div>

        {/* Avatar with glow ring */}
        <div className={`relative ${avatarSizes[idx]} mt-3`}>
          <div className="absolute inset-[-3px] rounded-2xl bg-gradient-to-br from-white/20 to-transparent blur-sm" />
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover border-2 border-white/20 shadow-2xl" />
          ) : (
            <div className={`w-full h-full rounded-2xl flex items-center justify-center text-2xl font-black bg-gradient-to-br ${gradients[idx]} border-2 ${textColors[idx]} shadow-xl`}>
              {(entry.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div className={`font-bold text-sm text-center mt-3 mb-1 ${textColors[idx]} max-w-[100px] truncate drop-shadow-glow`}>
        {entry.name || 'Unknown'}
      </div>

      {/* Points */}
      <div className="text-xs text-gray-400 font-medium mb-3">{(entry.points || 0).toLocaleString()} pts</div>

      {/* Podium Bar with glow effect */}
      <div className={`w-16 xs:w-20 sm:w-24 ${heights[idx]} rounded-t-2xl bg-gradient-to-b ${gradients[idx]} border-t border-x relative overflow-hidden shadow-xl`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        <span className={`text-2xl sm:text-3xl font-black ${textColors[idx]} relative z-10 drop-shadow-lg`}>#{position}</span>
      </div>
    </motion.div>
  )
}

/* ─── List Row ─── */
function ListRow({ entry, index, isMe }) {
  const rankStyle = index < 3 ? {
    0: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: '🥇' },
    1: { bg: 'bg-slate-400/10', border: 'border-slate-400/30', text: 'text-gray-200', badge: '🥈' },
    2: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: '🥉' },
  }[index] : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isMe
          ? 'border-primary-400/60 bg-primary-500/10 shadow-lg shadow-primary-500/20'
          : rankStyle
          ? `${rankStyle.bg} ${rankStyle.border}`
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Rank */}
        <div className="w-10 text-center flex-shrink-0">
          {rankStyle ? (
            <span className="text-2xl">{rankStyle.badge}</span>
          ) : (
            <span className="text-gray-500 font-bold text-sm">#{entry.rank}</span>
          )}
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
          ) : (
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm ${
              isMe ? 'bg-primary-500/20 text-primary-300 border border-primary-400/40' : 'bg-white/[0.05] text-gray-400 border border-white/[0.08]'
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
              <span className="px-2 py-0.5 rounded-full bg-primary-500/30 border border-primary-400/40 text-[10px] font-bold text-primary-300 uppercase tracking-wider shadow-sm">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Zap size={12} className={isMe ? 'text-primary-400/70' : 'text-gray-600'} />
            <span>Level {Math.floor((entry.points || 0) / 1000) + 1}</span>
          </div>
        </div>

        {/* Points */}
        <div className="flex-shrink-0 text-right">
          <div className={`font-black text-base ${isMe ? 'text-primary-300' : rankStyle ? rankStyle.text : 'text-white'}`}>
            {(entry.points || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">pts</div>
        </div>
      </div>

      {/* Glow line for top 3 */}
      {rankStyle && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
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
    <div className="max-w-2xl mx-auto px-3 sm:px-4">
      
      {/* ═══ HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/5 to-transparent border border-amber-400/30 p-5 sm:p-8 mb-6 sm:mb-10 shadow-2xl shadow-amber-500/10"
      >
        {/* Ambient glow orbs */}
        <div className="absolute top-[-40%] right-[-20%] w-64 h-64 bg-amber-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-30%] left-[-20%] w-56 h-56 bg-orange-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/30 to-yellow-500/20 border border-amber-400/40 flex items-center justify-center shadow-xl shadow-amber-500/20 flex-shrink-0">
            <Trophy size={26} className="sm:w-9 sm:h-9 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-0.5 sm:mb-1">Leaderboard</h1>
            <p className="text-gray-300 text-xs sm:text-sm font-light">Compete, climb, and claim your glory.</p>
          </div>
        </div>

        {myRank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 mt-4 sm:mt-6 inline-flex items-center gap-2.5 sm:gap-4 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm max-w-full overflow-x-auto no-scrollbar"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Target size={14} className="sm:w-4 sm:h-4 text-primary-400" />
              <span className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Your Rank</span>
            </div>
            <div className="w-px h-5 bg-white/10 flex-shrink-0" />
            <span className="font-black text-xl sm:text-2xl text-amber-300 drop-shadow-glow flex-shrink-0">#{myRank}</span>
            <div className="w-px h-5 bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Star size={13} className="sm:w-3.5 sm:h-3.5 text-amber-300 fill-amber-300" />
              <span className="text-sm font-bold text-white">{myEntry?.points?.toLocaleString() || 0}</span>
              <span className="text-xs text-gray-400">pts</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ═══ PERIOD TABS ═══ */}
      <div className="relative mb-8 sm:mb-10">
        <div className="flex bg-white/[0.03] rounded-2xl p-1 border border-white/[0.06] backdrop-blur-sm overflow-x-auto no-scrollbar">
          {PERIODS.map(p => {
            const Icon = p.icon
            const isActive = period === p.key
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`relative flex-1 min-w-[78px] flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/30"
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <Icon size={15} className="sm:w-4 sm:h-4" />
                  {p.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ LOADING ═══ */}
      {isLoading ? (
        <div className="space-y-4">
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
          <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} className="text-gray-500" />
          </div>
          <p className="text-gray-300 font-medium text-lg">No contenders yet</p>
          <p className="text-gray-500 text-sm mt-2">Be the first to rise to the top!</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          
          {/* ═══ TOP 3 PODIUM ═══ */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-3 xs:gap-5 pb-2 px-1">
              {topThree.map((entry, i) => (
                <PodiumCard key={entry.userId} entry={entry} position={i + 1} delay={i * 0.15} />
              ))}
            </div>
          )}

          {/* ═══ REST OF LIST ═══ */}
          {rest.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">Rankings</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .drop-shadow-glow {
          text-shadow: 0 0 10px rgba(251,191,36,0.3);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
