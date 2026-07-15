import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useIdentity } from '../lib/identity.js';
import { StatTile } from '@/components/ui/stat-tile';
import { Badge } from '@/components/ui/badge';
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
  Lock as LockIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompetitionState {
  locked: boolean;
  status: string;
  currentRound: number;
  unlockedRound: number | null;
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

const statusConfig: Record<
  string,
  { color: string; dot: string; label: string }
> = {
  NOT_STARTED: {
    color: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    label: 'Not Started',
  },
  RUNNING: {
    color: 'text-success',
    dot: 'bg-success',
    label: 'Running',
  },
  PAUSED: { color: 'text-warning', dot: 'bg-warning', label: 'Paused' },
  ENDED: { color: 'text-destructive', dot: 'bg-destructive', label: 'Ended' },
};

// ---------------------------------------------------------------------------
// Competition Status Card
// ---------------------------------------------------------------------------

function CompetitionStatusCard({ state }: { state: CompetitionState }) {
  const cfg = statusConfig[state.status] ?? statusConfig.NOT_STARTED;

  const quickAction =
    state.status === 'RUNNING' ? (
      <Link to="/challenges" className="text-sm font-semibold text-brand hover:text-brand/80 transition-colors">
        Solve a Challenge →
      </Link>
    ) : (
      <Link to="/leaderboard" className="text-sm font-semibold text-brand hover:text-brand/80 transition-colors">
        View Leaderboard →
      </Link>
    );

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
            <Play className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Competition Status</h2>
            <p className="text-xs text-muted-foreground">Current state of the event</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${cfg.color} bg-surface-3 border border-border`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <InfoCell icon={<Target className="w-4 h-4 text-accent shrink-0" />} label="Active Round" value={state.unlockedRound ? `Round ${state.unlockedRound}` : 'None'} />
        <InfoCell
          icon={state.locked ? <LockIcon className="w-4 h-4 text-destructive shrink-0" /> : <Unlock className="w-4 h-4 text-success shrink-0" />}
          label="Submissions"
          value={state.locked ? 'Closed' : 'Open'}
          valueClass={state.locked ? 'text-destructive' : 'text-success'}
        />
        <InfoCell
          icon={state.leaderboardFrozen ? <Snowflake className="w-4 h-4 text-info shrink-0" /> : <BarChart3 className="w-4 h-4 text-success shrink-0" />}
          label="Leaderboard"
          value={state.leaderboardFrozen ? 'Frozen' : 'Live'}
          valueClass={state.leaderboardFrozen ? 'text-info' : 'text-success'}
        />
        <InfoCell icon={<Flame className="w-4 h-4 text-brand shrink-0" />} label="Quick Action" value={null} custom={quickAction} />
      </div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  valueClass,
  custom,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  valueClass?: string;
  custom?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-1 rounded-md border border-border">
      {icon}
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {custom ? (
          custom
        ) : (
          <p className={`text-sm font-semibold ${valueClass ?? 'text-foreground'}`}>{value}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top 3 Podium
// ---------------------------------------------------------------------------

function Podium({ entries }: { entries: OverallEntry[] }) {
  const top3 = [...entries]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  if (top3.length === 0) return null;

  const podiumStyles = [
    // rank 1 (center)
    'w-20 h-[92px] bg-brand-soft border border-brand/20 rounded-t-md flex items-center justify-center',
    // rank 2
    'w-16 h-[60px] bg-surface-3 border border-border rounded-t-md flex items-center justify-center',
    // rank 3
    'w-14 h-[40px] bg-surface-3 border border-border rounded-t-md flex items-center justify-center',
  ];
  const medalStyles = [
    'w-10 h-10 rounded-full bg-brand text-brand-foreground flex items-center justify-center shadow-soft-md ring-2 ring-brand/30',
    'w-8 h-8 rounded-full bg-surface-4 text-muted-foreground flex items-center justify-center',
    'w-8 h-8 rounded-full bg-surface-4 text-muted-foreground flex items-center justify-center',
  ];

  // Render order: 2nd, 1st, 3rd
  const order = [1, 0, 2].filter((i) => top3[i]);

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-brand" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Top Participants</h2>
          <p className="text-xs text-muted-foreground">Overall leaderboard podium</p>
        </div>
      </div>

      <div className="flex items-end justify-center gap-3 min-h-[160px]">
        {order.map((i) => {
          const e = top3[i];
          return (
            <div key={e.userId} className="flex flex-col items-center gap-2">
              <div className={medalStyles[i]}>
                <Medal className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground text-center leading-tight max-w-[80px] truncate">
                {e.name.split(' ')[0]}
              </p>
              <p className="text-sm font-bold text-brand num">{e.totalScore.toFixed(1)}</p>
              <div className={podiumStyles[i]}>
                <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > 3 && (
        <Link
          to="/leaderboard"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors"
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

  const { data: competitionState } = useQuery<{ unlockedRound: number | null; locked: boolean }>({
    queryKey: ['competition-state-quick'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    staleTime: 10_000,
  });

  const unlockedRound = competitionState?.unlockedRound ?? null;
  const globallyLocked = competitionState?.locked ?? true;

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
            <Swords className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Challenges</h2>
            <p className="text-xs text-muted-foreground">{challenges.length} published</p>
          </div>
        </div>
        <Link
          to="/challenges"
          className="text-xs text-brand hover:text-brand/80 transition-colors flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1">
        {visible.map((challenge, i) => {
          const isLocked =
            !unlockedRound ||
            challenge.roundNumber !== unlockedRound ||
            globallyLocked;
          const variant = difficultyVariant[challenge.difficulty] ?? 'success';
          return (
            <motion.button
              key={challenge.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                if (!isLocked) navigate(`/challenges/${challenge.id}`);
              }}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-3 transition-colors group ${
                isLocked ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand/70 shrink-0" />
              <span className="flex-1 text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors truncate">
                {challenge.title}
              </span>
              <Badge variant={variant} size="sm">
                {difficultyLabel[challenge.difficulty]}
              </Badge>
              <span className="text-[10px] text-muted-foreground num">R{challenge.roundNumber}</span>
              {isLocked && (
                <span className="text-[10px] text-muted-foreground bg-surface-3 border border-border px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {globallyLocked ? 'Closed' : 'Locked'}
                </span>
              )}
              {!isLocked && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {challenges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
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
    <div className="bg-card border border-border rounded-lg shadow-soft-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
          <UserCheck className="w-4 h-4 text-success" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Your Performance</h2>
          <p className="text-xs text-muted-foreground">Your standing in the competition</p>
        </div>
      </div>

      {myEntry ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="px-3 py-3 bg-brand-soft rounded-md border border-brand/20 text-center">
            <p className="text-xl font-bold text-brand num">#{myEntry.rank}</p>
            <p className="text-[10px] text-brand/70 mt-0.5">Rank</p>
          </div>
          <div className="px-3 py-3 bg-surface-1 rounded-md border border-border text-center">
            <p className="text-xl font-bold text-foreground num">{myEntry.totalScore.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Score</p>
          </div>
          <div className="px-3 py-3 bg-surface-1 rounded-md border border-border text-center">
            <p className="text-xl font-bold text-foreground num">{myEntry.challengesCompleted}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Sparkles className="w-7 h-7 mb-2 opacity-30" />
          <p className="text-sm">No submissions yet</p>
          <Link
            to="/challenges"
            className="mt-2 text-xs text-brand hover:text-brand/80 transition-colors"
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
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const identity = useIdentity();

  // Fetch competition state — poll every 3s for near-instant challenge-start detection
  const { data: state, isLoading: stateLoading } = useQuery<CompetitionState>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    refetchInterval: 3_000,
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: async () => {
      const res = await fetch('/api/participants');
      if (!res.ok) throw new Error('Failed to fetch participants');
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await fetch('/api/challenges');
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    },
    refetchInterval: 5_000,
    staleTime: 2_000,
  });

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

  const statusBlurb =
    state?.status === 'RUNNING'
      ? 'The competition is live — jump in and start coding!'
      : state?.status === 'PAUSED'
        ? 'The competition is paused. Check back soon.'
        : state?.status === 'ENDED'
          ? 'The competition has ended. Check the leaderboard for final results.'
          : 'The competition hasn’t started yet. Stay tuned!';

  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand" />
        <p>Loading dashboard…</p>
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
      <motion.div variants={itemVariants} className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back{identity ? `, ${identity.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{statusBlurb}</p>
      </motion.div>

      {state && (
        <motion.div variants={itemVariants} className="mb-5">
          <CompetitionStatusCard state={state} />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile icon={Users} label="Participants" value={participantCount} sub="Registered for the event" accent="success" />
        <StatTile icon={Swords} label="Challenges" value={challenges.length} sub={challenges.length > 0 ? `Across ${new Set(challenges.map((c) => c.roundNumber)).size} rounds` : 'Published'} accent="brand" />
        <StatTile icon={Trophy} label="Top Score" value={topEntries.length > 0 ? topEntries[0].totalScore.toFixed(1) : '—'} sub={topEntries.length > 0 ? topEntries[0].name : 'No data yet'} accent="warning" />
        <StatTile icon={BarChart3} label="On Board" value={topEntries.length} sub="In the overall leaderboard" accent="info" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Podium entries={topEntries} />
        </div>
        <div>
          {identity && <UserPerformance currentUserId={identity.id} leaderboard={topEntries} />}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-5">
        <ChallengeQuickList challenges={challenges} />
      </motion.div>
    </motion.div>
  );
}
