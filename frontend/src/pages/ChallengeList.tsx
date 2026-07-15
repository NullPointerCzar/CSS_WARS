import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Swords,
  Loader2,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../lib/identity.js';
import { Badge } from '@/components/ui/badge';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  targetImageUrl: string;
  roundNumber: number;
}

const difficultyVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  EASY: 'success',
  MEDIUM: 'warning',
  HARD: 'danger',
};

const difficultyLabel: Record<string, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

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

  const challengeIds = challenges.map((c) => c.id);
  const { data: submissionsMap = {} } = useQuery<Record<string, { hasSubmitted: boolean; bestScore: number | null }>>({
    queryKey: ['my-submissions-status', identity?.id, challengeIds],
    queryFn: async () => {
      if (!identity?.id || challengeIds.length === 0) return {};
      const results: Record<string, { hasSubmitted: boolean; bestScore: number | null }> = {};
      const fetches = challengeIds.map(async (cid) => {
        try {
          const res = await fetch(`/api/submissions/mine?userId=${identity.id}&challengeId=${cid}`);
          if (!res.ok) {
            results[cid] = { hasSubmitted: false, bestScore: null };
            return;
          }
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
      <div className="flex items-center gap-3 mb-7">
        <div className="w-11 h-11 rounded-md border border-border bg-surface-3 flex items-center justify-center">
          <Swords className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Challenges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pick a challenge and write your CSS solution</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand" />
          <p>Loading challenges…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mb-4" />
          <p className="text-destructive">Failed to load challenges. Please try again.</p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Swords className="w-10 h-10 mb-4 opacity-30" />
          <p className="text-base font-medium text-foreground">No challenges available yet</p>
          <p className="text-sm mt-1">Check back later — challenges will appear here once published.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {challenges.map((challenge, i) => {
            const isLocked =
              !unlockedRound ||
              challenge.roundNumber !== unlockedRound ||
              globallyLocked;
            const status = submissionsMap[challenge.id];
            return (
              <motion.button
                key={challenge.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  if (!isLocked) navigate(`/challenges/${challenge.id}`);
                }}
                className={`w-full text-left group bg-card hover:bg-surface-2 border border-border hover:border-brand/40 rounded-lg p-5 transition-all duration-200 shadow-soft-sm ${
                  isLocked ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <span className="text-[11px] font-medium text-muted-foreground bg-surface-3 border border-border px-2 py-0.5 rounded">
                        Round {challenge.roundNumber}
                      </span>
                      <Badge variant={difficultyVariant[challenge.difficulty] ?? 'success'} size="sm">
                        {difficultyLabel[challenge.difficulty]}
                      </Badge>
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-surface-3 border border-border px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" />
                          {globallyLocked ? 'Submissions Closed' : 'Round Locked'}
                        </span>
                      )}
                      {!isLocked && status?.hasSubmitted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-soft border border-success/20 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          {status.bestScore !== null ? `${status.bestScore}%` : 'Submitted'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-foreground group-hover:text-brand transition-colors mb-1">
                      {challenge.title}
                    </h2>
                    {challenge.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">{challenge.description}</p>
                    )}
                  </div>
                  {!isLocked && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors shrink-0 mt-1" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
