import { useState, useCallback, type ReactNode, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../../lib/api.js';
import {
  Play,
  Pause,
  StopCircle,
  Lock,
  Unlock,
  Snowflake,
  Download,
  Swords,
  Loader2,
  AlertCircle,
  ChevronRight,
  Eye,
  Target,
  FileText,
  Users,
} from 'lucide-react';
import { AdminParticipantManagementInline } from './AdminParticipantManagement.js';

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

// ---------------------------------------------------------------------------
// Stats card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  variant,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}>
            <AlertCircle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Competition Controls Section
// ---------------------------------------------------------------------------

function CompetitionControls({
  state,
  onRefresh,
}: {
  state: CompetitionState;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ type: string; payload: any } | null>(null);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiPatch('/api/admin/competition/status', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      return apiPatch('/api/admin/competition/lock', { locked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const roundMutation = useMutation({
    mutationFn: async (round: number | null) => {
      return apiPatch('/api/admin/competition/round/unlock', { round });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const lockAllRoundsMutation = useMutation({
    mutationFn: async () => {
      return apiPatch('/api/admin/competition/round/lock');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const executeAction = useCallback((type: string, payload?: any) => {
    switch (type) {
      case 'status':
        statusMutation.mutate(payload.status);
        break;
      case 'lock':
        lockMutation.mutate(payload.locked);
        break;
      case 'round':
        roundMutation.mutate(payload.round);
        break;
      case 'lock-all-rounds':
        lockAllRoundsMutation.mutate();
        break;
    }
    setConfirmAction(null);
  }, [statusMutation, lockMutation, roundMutation, lockAllRoundsMutation]);

  const handleAction = useCallback((type: string, payload?: any) => {
    const destructiveActions = ['ENDED', 'lock-all-rounds'];
    if (destructiveActions.includes(payload?.type ?? type)) {
      setConfirmAction({ type, payload });
      return;
    }
    executeAction(type, payload);
  }, [executeAction]);

  const statusLabels: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    RUNNING: 'Running',
    PAUSED: 'Paused',
    ENDED: 'Ended',
  };

  const statusColors: Record<string, string> = {
    NOT_STARTED: 'text-slate-400 bg-slate-500/10',
    RUNNING: 'text-emerald-400 bg-emerald-500/10',
    PAUSED: 'text-amber-400 bg-amber-500/10',
    ENDED: 'text-red-400 bg-red-500/10',
  };

  const isPending = statusMutation.isPending || lockMutation.isPending || roundMutation.isPending;

  return (
    <>
      <SectionCard
        icon={<Swords className="w-4 h-4 text-amber-400" />}
        title="Competition Controls"
        description="Manage the overall competition state"
      >
        {/* Status display */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm text-slate-400">Status:</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium ${state ? statusColors[state.status] : 'text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${state ? {
              NOT_STARTED: 'bg-slate-400',
              RUNNING: 'bg-emerald-400',
              PAUSED: 'bg-amber-400',
              ENDED: 'bg-red-400',
            }[state.status] : 'bg-slate-500'}`} />
            {state ? statusLabels[state.status] : 'Unknown'}
          </span>
          <span className="text-sm text-slate-400 ml-2">Round:</span>
          <span className="text-sm font-bold text-white">{state?.currentRound ?? 1}</span>
        </div>

        {/* Status buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {state?.status !== 'RUNNING' && (
            <button
              onClick={() => handleAction('status', { status: 'RUNNING' })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {state?.status === 'PAUSED' ? 'Resume' : 'Start'}
            </button>
          )}
          {state?.status === 'RUNNING' && (
            <button
              onClick={() => handleAction('status', { status: 'PAUSED' })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}
          {state?.status !== 'ENDED' && (
            <button
              onClick={() => handleAction('status', { status: 'ENDED' })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <StopCircle className="w-3.5 h-3.5" />
              End
            </button>
          )}
        </div>

        {/* Lock toggle */}
        <div className="flex items-center justify-between py-3 px-4 bg-slate-950/50 rounded-xl border border-slate-800/50 mb-3">
          <div className="flex items-center gap-3">
            {state?.locked ? (
              <Lock className="w-4 h-4 text-red-400" />
            ) : (
              <Unlock className="w-4 h-4 text-emerald-400" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {state?.locked ? 'Submissions Locked' : 'Submissions Open'}
              </p>
              <p className="text-xs text-slate-500">
                {state?.locked ? 'No new submissions accepted' : 'Participants can submit'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!state?.locked) {
                setConfirmAction({ type: 'lock', payload: { locked: true } });
              } else {
                executeAction('lock', { locked: false });
              }
            }}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              state?.locked
                ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
            }`}
          >
            {state?.locked ? 'Unlock' : 'Lock'}
          </button>
        </div>

         {/* Round control */}
         <div className="bg-slate-950/50 rounded-xl border border-slate-800/50 p-4">
           <div className="flex items-center gap-3 mb-4">
             <Target className="w-4 h-4 text-blue-400" />
             <div>
               <p className="text-sm font-medium text-white">Rounds</p>
               <p className="text-xs text-slate-500">
                 {state?.unlockedRound
                   ? `Round ${state.unlockedRound} is currently unlocked`
                   : 'No round is currently unlocked'}
               </p>
             </div>
           </div>
           <div className="flex flex-wrap gap-2">
             {[1, 2, 3].map((round) => (
               <button
                 key={round}
                 onClick={() => {
                   if (state?.unlockedRound === round) {
                     setConfirmAction({ type: 'lock-all-rounds', payload: {} });
                   } else {
                     executeAction('round', { round });
                   }
                 }}
                 disabled={isPending}
                 className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                   state?.unlockedRound === round
                     ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                     : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                 }`}
               >
                 Round {round} {state?.unlockedRound === round ? '(Active)' : 'Locked'}
               </button>
             ))}
           </div>
         </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === 'lock'
            ? 'Lock Submissions'
            : confirmAction?.type === 'lock-all-rounds'
              ? 'Lock All Rounds'
              : 'End Competition'
        }
        message={
          confirmAction?.type === 'lock'
            ? 'This will prevent all participants from submitting new solutions. Are you sure?'
            : confirmAction?.type === 'lock-all-rounds'
              ? 'This will lock the currently unlocked round. Participants will not be able to submit to any round. Are you sure?'
              : 'This will mark the competition as ended. No further submissions or changes will be possible for participants. Are you sure?'
        }
        confirmLabel={
          confirmAction?.type === 'lock'
            ? 'Lock Submissions'
            : confirmAction?.type === 'lock-all-rounds'
              ? 'Lock Round'
              : 'End Competition'
        }
        variant={
          confirmAction?.type === 'lock'
            ? 'warning'
            : confirmAction?.type === 'lock-all-rounds'
              ? 'danger'
              : 'danger'
        }
        onConfirm={() => {
          if (confirmAction) {
            executeAction(confirmAction.type, confirmAction.payload);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard Controls Section
// ---------------------------------------------------------------------------

function LeaderboardControls({
  state,
  onRefresh,
}: {
  state: CompetitionState;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const freezeMutation = useMutation({
    mutationFn: async () => {
      return apiPatch('/api/admin/leaderboard/freeze');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleExport = async () => {
    try {
      const identity = (await import('../../lib/identity.js')).getIdentity();
      const res = await fetch('/api/admin/leaderboard/export', {
        headers: { 'x-user-id': identity?.id ?? '' },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `csswars-leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <SectionCard
      icon={<Snowflake className="w-4 h-4 text-blue-400" />}
      title="Leaderboard Controls"
      description="Freeze/unfreeze results and export data"
    >
      <div className="flex items-center justify-between py-3 px-4 bg-slate-950/50 rounded-xl border border-slate-800/50 mb-3">
        <div className="flex items-center gap-3">
          {state?.leaderboardFrozen ? (
            <Snowflake className="w-4 h-4 text-blue-400" />
          ) : (
            <Eye className="w-4 h-4 text-emerald-400" />
          )}
          <div>
            <p className="text-sm font-medium text-white">
              {state?.leaderboardFrozen ? 'Leaderboard Frozen' : 'Leaderboard Live'}
            </p>
            <p className="text-xs text-slate-500">
              {state?.leaderboardFrozen
                ? 'Results are frozen — showing snapshot'
                : 'Showing live results'}
            </p>
          </div>
        </div>
        <button
          onClick={() => freezeMutation.mutate()}
          disabled={freezeMutation.isPending}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            state?.leaderboardFrozen
              ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
              : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
          }`}
        >
          {freezeMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : state?.leaderboardFrozen ? (
            'Unfreeze'
          ) : (
            'Freeze'
          )}
        </button>
      </div>

      <button
        onClick={handleExport}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-sm text-slate-300 hover:text-white transition-colors"
      >
        <Download className="w-4 h-4 text-emerald-400" />
        Export CSV
      </button>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400 mt-2"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Quick Nav Cards
// ---------------------------------------------------------------------------

function QuickNavCards() {
  return (
    <div className="space-y-3">
      <Link
        to="/admin/challenges"
        className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Swords className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Challenges</p>
            <p className="text-xs text-slate-500">Create, edit, and manage CSS challenges</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
      </Link>

      <Link
        to="/admin/submissions"
        className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Submissions</p>
            <p className="text-xs text-slate-500">Review, rejudge, and manage submissions</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
      </Link>

      <Link
        to="/admin/participants"
        className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Participants</p>
            <p className="text-xs text-slate-500">Add, edit, and manage participants</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Dashboard — Main Page
// ---------------------------------------------------------------------------

export function AdminDashboard() {
  const {
    data: state,
    isLoading,
    isError,
    refetch,
  } = useQuery<CompetitionState>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      return apiGet('/api/competition/state');
    },
    refetchInterval: 10_000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [submissions, challenges, participants] = await Promise.all([
        apiGet<any[]>('/api/admin/submissions'),
        apiGet<any[]>('/api/admin/challenges'),
        fetch('/api/participants').then((r) => r.json()),
      ]);
      return {
        totalSubmissions: submissions.length,
        totalChallenges: challenges.length,
        totalParticipants: participants.filter((p: any) => p.role !== 'ADMIN').length,
      };
    },
    staleTime: 10_000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (isError || !state) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400">Failed to load competition state.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">Overview and quick controls for the competition</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Swords className="w-5 h-5 text-amber-400" />}
          label="Challenges"
          value={stats?.totalChallenges ?? '—'}
          color="bg-amber-500/10"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          label="Participants"
          value={stats?.totalParticipants ?? '—'}
          color="bg-emerald-500/10"
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-purple-400" />}
          label="Submissions"
          value={stats?.totalSubmissions ?? '—'}
          color="bg-purple-500/10"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <CompetitionControls state={state} onRefresh={() => refetch()} />
          <LeaderboardControls state={state} onRefresh={() => refetch()} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SectionCard
            icon={<Target className="w-4 h-4 text-blue-400" />}
            title="Quick Navigation"
            description="Access other admin sections"
          >
            <QuickNavCards />
          </SectionCard>

          <AdminParticipantManagementInline />
        </div>
      </div>
    </div>
  );
}
