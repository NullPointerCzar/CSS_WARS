import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Swords,
  Loader2,
  Trophy,
  Users,
  Target,
  BarChart3,
  Medal,
  Play,
  ChevronRight,
  Lock,
  Unlock,
  Snowflake,
  UserCheck,
  Flame,
  Sparkles,
} from 'lucide-react';
import { useIdentity } from '../lib/identity.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitionState {
  locked: boolean;
  status: string;
  currentRound: number;
  leaderboardFrozen: boolean;
}

interface Challenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  roundNumber: number;
}

interface OverallEntry {
  rank: number;
  userId: string;
  name: string;
  rollNumber: string | null;
  totalScore: number;
  challengesCompleted: number;
}

interface OverallResponse {
  frozen?: boolean;
  frozenAt?: string;
  entries: OverallEntry[];
}

interface Participant {
  id: string;
  name: string;
  role: string;
  hasPin: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const difficultyConfig = {
  EASY: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Easy' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
  HARD: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Hard' },
};

// Static accent mapping for Tailwind JIT (dynamic class interpolation not supported)
const accentStyles: Record<string, { ring: string; text: string }> = {
  emerald: { ring: 'ring-emerald-500/20', text: 'text-emerald-400' },
  amber: { ring: 'ring-amber-500/20', text: 'text-amber-400' },
  blue: { ring: 'ring-blue-500/20', text: 'text-blue-400' },
};

const statusConfig: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  NOT_STARTED: { color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400', label: 'Not Started' },
  RUNNING: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', label: 'Running' },
  PAUSED: { color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400', label: 'Paused' },
  ENDED: { color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400', label: 'Ended' },
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  const ring = accent ? accentStyles[accent]?.ring ?? '' : '';
  const textCls = accent ? accentStyles[accent]?.text ?? 'text-amber-400' : 'text-amber-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-xl ${ring}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center ${textCls}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Competiton Status Card
// ---------------------------------------------------------------------------

function CompetitionStatusCard({ state }: { state: CompetitionState }) {
  const cfg = statusConfig[state.status] ?? statusConfig.NOT_STARTED;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Play className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Competition Status</h2>
            <p className="text-xs text-slate-500">Current state of the event</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium ${cfg.bg} ${cfg.color}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Round */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
          <Target className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Current Round</p>
            <p className="text-lg font-bold text-white">{state.currentRound}</p>
          </div>
        </div>

        {/* Lock */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
          {state.locked ? (
            <Lock className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <div>
            <p className="text-xs text-slate-500">Submissions</p>
            <p className={`text-sm font-semibold ${state.locked ? 'text-red-400' : 'text-emerald-400'}`}>
              {state.locked ? 'Closed' : 'Open'}
            </p>
          </div>
        </div>

        {/* Freeze */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
          {state.leaderboardFrozen ? (
            <Snowflake className="w-4 h-4 text-blue-400 shrink-0" />
          ) : (
            <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <div>
            <p className="text-xs text-slate-500">Leaderboard</p>
            <p className={`text-sm font-semibold ${state.leaderboardFrozen ? 'text-blue-400' : 'text-emerald-400'}`}>
              {state.leaderboardFrozen ? 'Frozen' : 'Live'}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Quick Action</p>
            {state.status === 'RUNNING' ? (
              <Link to="/challenges" className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                Solve a Challenge →
              </Link>
            ) : (
              <Link to="/leaderboard" className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                View Leaderboard →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top 3 Podium
// ---------------------------------------------------------------------------

function Podium({ entries }: { entries: OverallEntry[] }) {
  const top3 = entries.slice(0, 3);

  // Sort by rank so 1st is center
  const sorted = [...top3].sort((a, b) => a.rank - b.rank);

  if (top3.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Top Participants</h2>
          <p className="text-xs text-slate-500">Overall leaderboard podium</p>
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 min-h-[160px]">
        {sorted.length >= 2 && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg">
              <Medal className="w-4 h-4 text-slate-700" />
            </div>
            <p className="text-sm font-semibold text-white text-center leading-tight max-w-[80px] truncate">
              {sorted[1].name.split(' ')[0]}
            </p>
            <p className="text-lg font-bold text-slate-300">{sorted[1].totalScore.toFixed(1)}</p>
            <div className="w-16 h-[60px] bg-slate-800 rounded-t-xl flex items-center justify-center">
              <span className="text-xl font-bold text-slate-400">2</span>
            </div>
          </div>
        )}

        {sorted.length >= 1 && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/30">
              <Medal className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-white text-center leading-tight max-w-[80px] truncate">
              {sorted[0].name.split(' ')[0]}
            </p>
            <p className="text-lg font-bold text-amber-400">{sorted[0].totalScore.toFixed(1)}</p>
            <div className="w-20 h-[90px] bg-gradient-to-t from-amber-500/20 to-amber-500/5 rounded-t-xl border border-amber-500/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-400">1</span>
            </div>
          </div>
        )}

        {sorted.length >= 3 && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg">
              <Medal className="w-4 h-4 text-amber-200" />
            </div>
            <p className="text-sm font-semibold text-white text-center leading-tight max-w-[80px] truncate">
              {sorted[2].name.split(' ')[0]}
            </p>
            <p className="text-lg font-bold text-amber-600">{sorted[2].totalScore.toFixed(1)}</p>
            <div className="w-14 h-[40px] bg-slate-800 rounded-t-xl flex items-center justify-center">
              <span className="text-lg font-bold text-slate-500">3</span>
            </div>
          </div>
        )}
      </div>

      {entries.length > 3 && (
        <Link
          to="/leaderboard"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
        >
          View full leaderboard
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Challenge Quick List
// ---------------------------------------------------------------------------

function ChallengeQuickList({ challenges }: { challenges: Challenge[] }) {
  const navigate = useNavigate();
  const visible = challenges.slice(0, 5);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Swords className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Challenges</h2>
            <p className="text-xs text-slate-500">{challenges.length} published</p>
          </div>
        </div>
        <Link
          to="/challenges"
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1.5">
        {visible.map((challenge, i) => {
          const cfg = difficultyConfig[challenge.difficulty];
          return (
            <motion.button
              key={challenge.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/challenges/${challenge.id}`)}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors group"
            >
              <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
              <span className="flex-1 text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                {challenge.title}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-slate-600">R{challenge.roundNumber}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {challenges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <Swords className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No challenges published yet</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Performance Section
// ---------------------------------------------------------------------------

function UserPerformance({
  currentUserId,
  leaderboard,
}: {
  currentUserId: string;
  leaderboard: OverallEntry[];
}) {
  const myEntry = leaderboard.find((e) => e.userId === currentUserId);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Your Performance</h2>
          <p className="text-xs text-slate-500">Your standing in the competition</p>
        </div>
      </div>

      {myEntry ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="px-3 py-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
            <p className="text-2xl font-bold text-amber-400">#{myEntry.rank}</p>
            <p className="text-[10px] text-amber-500/70 mt-0.5">Rank</p>
          </div>
          <div className="px-3 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-center">
            <p className="text-2xl font-bold text-white">{myEntry.totalScore.toFixed(1)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total Score</p>
          </div>
          <div className="px-3 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-center">
            <p className="text-2xl font-bold text-white">{myEntry.challengesCompleted}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Completed</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-slate-500">
          <Sparkles className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No submissions yet</p>
          <Link
            to="/challenges"
            className="mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Solve your first challenge →
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard — Main Page
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const identity = useIdentity();

  // Fetch competition state
  const { data: state, isLoading: stateLoading } = useQuery<CompetitionState>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    refetchInterval: 15_000,
  });

  // Fetch participants
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: async () => {
      const res = await fetch('/api/participants');
      if (!res.ok) throw new Error('Failed to fetch participants');
      return res.json();
    },
    staleTime: 30_000,
  });

  // Fetch challenges
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await fetch('/api/challenges');
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    },
    staleTime: 30_000,
  });

  // Fetch overall leaderboard
  const { data: overallLb } = useQuery<OverallResponse>({
    queryKey: ['leaderboard-overall'],
    queryFn: async () => {
      const res = await fetch('/api/leaderboard/overall');
      if (!res.ok) throw new Error('Failed to fetch overall leaderboard');
      return res.json();
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const participantCount = participants.filter((p) => p.role === 'PARTICIPANT').length;
  const topEntries = overallLb?.entries ?? [];

  // --- Loading state ---
  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back{identity ? `, ${identity.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400 mt-1">
            {state?.status === 'RUNNING'
              ? 'The competition is live — jump in and start coding!'
              : state?.status === 'PAUSED'
                ? 'The competition is paused. Check back soon.'
                : state?.status === 'ENDED'
                  ? 'The competition has ended. Check the leaderboard for final results.'
                  : 'The competition hasn\'t started yet. Stay tuned!'}
          </p>
        </div>
      </motion.div>

      {/* Competition Status */}
      {state && (
        <motion.div variants={itemVariants} className="mb-6">
          <CompetitionStatusCard state={state} />
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Participants"
          value={participantCount}
          sub="Registered for the event"
          accent="emerald"
        />
        <StatCard
          icon={<Swords className="w-5 h-5" />}
          label="Challenges"
          value={challenges.length}
          sub={challenges.length > 0 ? `Across ${new Set(challenges.map(c => c.roundNumber)).size} rounds` : 'Published'}
          accent="amber"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Top Score"
          value={topEntries.length > 0 ? topEntries[0].totalScore.toFixed(1) : '—'}
          sub={topEntries.length > 0 ? topEntries[0].name : 'No data yet'}
          accent="amber"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Participants With Scores"
          value={topEntries.length}
          sub="In the overall leaderboard"
          accent="blue"
        />
      </motion.div>

      {/* Main grid: Leaderboard Podium + Challenges + Your Performance */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Podium */}
        <div className="lg:col-span-2">
          <Podium entries={topEntries} />
        </div>

        {/* Right: User Performance */}
        <div>
          {identity && (
            <UserPerformance
              currentUserId={identity.id}
              leaderboard={topEntries}
            />
          )}
        </div>
      </motion.div>

      {/* Challenges List */}
      <motion.div variants={itemVariants} className="mt-6">
        <ChallengeQuickList challenges={challenges} />
      </motion.div>
    </motion.div>
  );
}
