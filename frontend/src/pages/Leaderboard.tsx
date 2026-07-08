import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trophy,
  Loader2,
  AlertCircle,
  Medal,
  Snowflake,
  Target,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { useIdentity } from '../lib/identity.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  rollNumber: string | null;
  score: number;
  codeLength: number;
  submittedAt: string;
}

interface OverallEntry {
  rank: number;
  userId: string;
  name: string;
  rollNumber: string | null;
  totalScore: number;
  challengesCompleted: number;
  perChallenge: Record<string, number>;
}

interface Challenge {
  id: string;
  title: string;
  roundNumber: number;
}

interface LeaderboardResponse {
  frozen?: boolean;
  frozenAt?: string;
  entries: LeaderboardEntry[];
}

interface OverallResponse {
  frozen?: boolean;
  frozenAt?: string;
  entries: OverallEntry[];
}

// ---------------------------------------------------------------------------
// Rank badge helper
// ---------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg shadow-slate-400/30">
        <Medal className="w-4 h-4 text-slate-700" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-700/30">
        <Medal className="w-4 h-4 text-amber-200" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
      <span className="text-sm font-semibold text-slate-400">{rank}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

function ScoreCell({ score, maxScore }: { score: number; maxScore?: number }) {
  const pct = maxScore ? (score / maxScore) * 100 : Math.min(score, 100);
  const color =
    pct >= 90
      ? 'text-emerald-400'
      : pct >= 75
        ? 'text-blue-400'
        : pct >= 50
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <span className={`font-mono font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard table component
// ---------------------------------------------------------------------------

function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: (LeaderboardEntry | OverallEntry)[];
  currentUserId: string | null;
}) {
  return (
    <div className="space-y-1">
      {entries.map((entry, i) => {
        const isCurrentUser = entry.userId === currentUserId;
        const lbEntry = entry as LeaderboardEntry;
        const ovEntry = entry as OverallEntry;

        return (
          <motion.div
            key={`${entry.userId}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
              isCurrentUser
                ? 'bg-amber-500/10 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                : 'hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            {/* Rank */}
            <div className="shrink-0">
              <RankBadge rank={entry.rank} />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium truncate ${
                    isCurrentUser ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {entry.name}
                </span>
                {isCurrentUser && (
                  <span className="text-[10px] font-medium text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                    You
                  </span>
                )}
              </div>
              {entry.rollNumber && (
                <span className="text-xs text-slate-500">{entry.rollNumber}</span>
              )}
            </div>

            {/* Score or Total Score */}
            {'score' in lbEntry ? (
              <div className="text-right shrink-0">
                <ScoreCell score={lbEntry.score} />
                <div className="text-[10px] text-slate-600 font-mono">
                  {lbEntry.codeLength.toLocaleString()} B
                </div>
              </div>
            ) : (
              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-white text-lg">
                  {ovEntry.totalScore.toFixed(1)}
                </span>
                <div className="text-[10px] text-slate-500">
                  {ovEntry.challengesCompleted} challenge{ovEntry.challengesCompleted !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View toggle
// ---------------------------------------------------------------------------

function ViewToggle({
  view,
  onChange,
}: {
  view: 'per-challenge' | 'overall';
  onChange: (v: 'per-challenge' | 'overall') => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1">
      <button
        onClick={() => onChange('per-challenge')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'per-challenge'
            ? 'bg-amber-500/20 text-amber-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
        }`}
      >
        <Target className="w-3.5 h-3.5" />
        Per Challenge
      </button>
      <button
        onClick={() => onChange('overall')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'overall'
            ? 'bg-amber-500/20 text-amber-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
        }`}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Overall
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Leaderboard component
// ---------------------------------------------------------------------------

export function Leaderboard() {
  const identity = useIdentity();
  const [view, setView] = useState<'per-challenge' | 'overall'>('overall');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  // Fetch all published challenges for the dropdown
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await fetch('/api/challenges');
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    },
    staleTime: 30_000,
  });

  // Auto-select first challenge when data loads
  useEffect(() => {
    if (!selectedChallengeId && challenges.length > 0) {
      setSelectedChallengeId(challenges[0].id);
    }
  }, [selectedChallengeId, challenges]);

  // Fetch per-challenge leaderboard
  const {
    data: challengeLb,
    isLoading: challengeLoading,
    isError: challengeError,
  } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', selectedChallengeId],
    queryFn: async () => {
      if (!selectedChallengeId) return { entries: [] };
      const res = await fetch(`/api/leaderboard?challengeId=${selectedChallengeId}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    enabled: view === 'per-challenge' && !!selectedChallengeId,
    refetchInterval: 8_000,
    staleTime: 4_000,
  });

  // Fetch overall leaderboard
  const {
    data: overallLb,
    isLoading: overallLoading,
    isError: overallError,
  } = useQuery<OverallResponse>({
    queryKey: ['leaderboard-overall'],
    queryFn: async () => {
      const res = await fetch('/api/leaderboard/overall');
      if (!res.ok) throw new Error('Failed to fetch overall leaderboard');
      return res.json();
    },
    enabled: view === 'overall',
    refetchInterval: 8_000,
    staleTime: 4_000,
  });

  const response = view === 'overall' ? overallLb : challengeLb;
  const isFrozen = response?.frozen ?? false;
  const frozenAt = response?.frozenAt ?? null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Leaderboard</h1>
          <p className="text-slate-400 mt-1">Live rankings — updated every few seconds</p>
        </div>
      </div>

      {/* Frozen banner */}
      {isFrozen && (
        <div className="flex items-center gap-3 mb-6 px-5 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <Snowflake className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-300">Results frozen</p>
            <p className="text-xs text-blue-400/70">
              Final standings were captured at{' '}
              {frozenAt ? new Date(frozenAt).toLocaleString() : 'an unknown time'}.
              New submissions are not reflected.
            </p>
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-between mb-6">
        <ViewToggle view={view} onChange={setView} />

        {view === 'per-challenge' && challenges.length > 0 && (
          <div className="relative">
            <select
              value={selectedChallengeId ?? ''}
              onChange={(e) => setSelectedChallengeId(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 cursor-pointer"
            >
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  Round {c.roundNumber} — {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Loading state */}
      {view === 'per-challenge' && challengeLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p>Loading leaderboard...</p>
        </div>
      )}

      {view === 'overall' && overallLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p>Loading overall rankings...</p>
        </div>
      )}

      {/* Error state */}
      {((view === 'per-challenge' && challengeError) ||
        (view === 'overall' && overallError)) && (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-400">Failed to load leaderboard.</p>
        </div>
      )}

      {/* Empty state */}
      {view === 'per-challenge' &&
        !challengeLoading &&
        !challengeError &&
        challengeLb?.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Trophy className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No submissions yet</p>
            <p className="text-sm mt-1">
              Be the first to submit a solution for this challenge!
            </p>
          </div>
        )}

      {view === 'overall' &&
        !overallLoading &&
        !overallError &&
        overallLb?.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-sm mt-1">
              Rankings will appear once participants submit solutions.
            </p>
          </div>
        )}

      {/* Leaderboard content */}
      {view === 'per-challenge' &&
        !challengeLoading &&
        !challengeError &&
        challengeLb &&
        challengeLb.entries.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <LeaderboardTable
              entries={challengeLb.entries}
              currentUserId={identity?.id ?? null}
            />
          </div>
        )}

      {view === 'overall' &&
        !overallLoading &&
        !overallError &&
        overallLb &&
        overallLb.entries.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <LeaderboardTable
              entries={overallLb.entries}
              currentUserId={identity?.id ?? null}
            />
          </div>
        )}
    </div>
  );
}
