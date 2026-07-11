import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Swords,
  Loader2,
  AlertCircle,
  ChevronRight,
  Circle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../lib/identity.js';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  targetImageUrl: string;
  roundNumber: number;
}

const difficultyConfig = {
  EASY: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Easy' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
  HARD: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Hard' },
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cfg = difficultyConfig[difficulty as keyof typeof difficultyConfig] ?? difficultyConfig.EASY;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Circle className="w-1.5 h-1.5 fill-current" />
      {cfg.label}
    </span>
  );
}

export function ChallengeList() {
  const navigate = useNavigate();
  const identity = useIdentity();

  const { data: challenges = [], isLoading, isError } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await fetch('/api/challenges');
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    },
  });

  const { data: competitionState } = useQuery<{ unlockedRound: number | null; locked: boolean }>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    staleTime: 10_000,
  });

  const unlockedRound = competitionState?.unlockedRound ?? null;
  const globallyLocked = competitionState?.locked ?? true;

  // Fetch submission status for each challenge for the current user
  const challengeIds = challenges.map((c) => c.id);
  const { data: submissionsMap = {} } = useQuery<Record<string, { hasSubmitted: boolean; bestScore: number | null }>>({
    queryKey: ['my-submissions-status', identity?.id, challengeIds],
    queryFn: async () => {
      if (!identity?.id || challengeIds.length === 0) return {};
      const results: Record<string, { hasSubmitted: boolean; bestScore: number | null }> = {};
      // Fetch for each challenge — simple approach without a batch endpoint
      const fetches = challengeIds.map(async (cid) => {
        try {
          const res = await fetch(`/api/submissions/mine?userId=${identity.id}&challengeId=${cid}`);
          if (!res.ok) { results[cid] = { hasSubmitted: false, bestScore: null }; return; }
          const subs = await res.json();
          const best = Array.isArray(subs) ? subs.find((s: any) => s.isBest) : null;
          results[cid] = {
            hasSubmitted: Array.isArray(subs) && subs.length > 0,
            bestScore: best?.score ? Number(best.score) : null,
          };
        } catch {
          results[cid] = { hasSubmitted: false, bestScore: null };
        }
      });
      await Promise.all(fetches);
      return results;
    },
    enabled: !!identity?.id && challengeIds.length > 0,
    staleTime: 10_000,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Challenges</h1>
          <p className="text-slate-400 mt-1">Pick a challenge and write your CSS solution</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
          <p>Loading challenges...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-400">Failed to load challenges. Please try again.</p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Swords className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No challenges available yet</p>
          <p className="text-sm mt-1">Check back later — challenges will appear here once published.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {challenges.map((challenge, i) => {
            const isLocked = !unlockedRound || challenge.roundNumber !== unlockedRound || globallyLocked;
            const status = submissionsMap[challenge.id];
            return (
              <motion.button
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  if (!isLocked) {
                    navigate(`/challenges/${challenge.id}`);
                  }
                }}
                className={`w-full text-left group bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all duration-200 shadow-xl ${
                  isLocked ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-lg">
                        Round {challenge.roundNumber}
                      </span>
                      <DifficultyBadge difficulty={challenge.difficulty} />
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-lg">
                          <Lock className="w-3.5 h-3.5" />
                          {globallyLocked ? 'Submissions Closed' : 'Round Locked'}
                        </span>
                      )}
                      {!isLocked && status?.hasSubmitted && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {status.bestScore !== null ? `${status.bestScore}%` : 'Submitted'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors mb-1">
                      {challenge.title}
                    </h2>
                    {challenge.description && (
                      <p className="text-slate-400 text-sm line-clamp-2">{challenge.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ChevronRight className={`w-5 h-5 text-slate-600 group-hover:text-amber-400 transition-colors ${isLocked ? 'opacity-50' : ''}`} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
