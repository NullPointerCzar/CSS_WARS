import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../../lib/api.js';
import { StatTile } from '@/components/ui/stat-tile';
import { Card } from '@/components/ui/card';
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
      className="fixed inset-0 bg-surface-1/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-lg p-6 shadow-soft-lg w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${variant === 'danger' ? 'bg-destructive-soft' : 'bg-warning-soft'}`}>
            <AlertCircle className={`w-5 h-5 ${variant === 'danger' ? 'text-destructive' : 'text-warning'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-surface-3 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium text-brand-foreground transition-colors ${variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' : 'bg-warning hover:bg-warning/90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
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

  const executeAction = useCallback(
    (type: string, payload?: any) => {
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
    },
    [statusMutation, lockMutation, roundMutation, lockAllRoundsMutation]
  );

  const handleAction = useCallback(
    (type: string, payload?: any) => {
      const destructiveActions = ['ENDED', 'lock-all-rounds'];
      if (destructiveActions.includes(payload?.type ?? type)) {
        setConfirmAction({ type, payload });
        return;
      }
      executeAction(type, payload);
    },
    [executeAction]
  );

  const statusLabels: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    RUNNING: 'Running',
    PAUSED: 'Paused',
    ENDED: 'Ended',
  };

  const statusStyles: Record<string, { text: string; dot: string; chip: string }> = {
    NOT_STARTED: { text: 'text-muted-foreground', dot: 'bg-muted-foreground', chip: 'bg-surface-3 border border-border' },
    RUNNING: { text: 'text-success', dot: 'bg-success', chip: 'bg-success-soft border border-success/20' },
    PAUSED: { text: 'text-warning', dot: 'bg-warning', chip: 'bg-warning-soft border border-warning/20' },
    ENDED: { text: 'text-destructive', dot: 'bg-destructive', chip: 'bg-destructive-soft border border-destructive/20' },
  };

  const isPending = statusMutation.isPending || lockMutation.isPending || roundMutation.isPending;

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
            <Swords className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Competition Controls</h2>
            <p className="text-xs text-muted-foreground">Manage the overall competition state</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm text-muted-foreground">Status:</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${state ? statusStyles[state.status].chip : 'bg-surface-3 border border-border'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state ? statusStyles[state.status].dot : 'bg-muted-foreground'}`} />
            {state ? statusLabels[state.status] : 'Unknown'}
          </span>
          <span className="text-sm text-muted-foreground ml-2">Round:</span>
          <span className="text-sm font-bold text-foreground num">{state?.currentRound ?? 1}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {state?.status !== 'RUNNING' && (
            <button
              onClick={() => handleAction('status', { status: 'RUNNING' })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-success-soft hover:bg-success/20 text-success text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {state?.status === 'PAUSED' ? 'Resume' : 'Start'}
            </button>
          )}
          {state?.status === 'RUNNING' && (
            <button
              onClick={() => handleAction('status', { status: 'PAUSED' })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-warning-soft hover:bg-warning/20 text-warning text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}
          {state?.status !== 'ENDED' && (
            <button
              onClick={() => handleAction('status', { status: 'ENDED' })}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-destructive-soft hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors disabled:opacity-50"
            >
              <StopCircle className="w-3.5 h-3.5" />
              End
            </button>
          )}
        </div>

        <div className="flex items-center justify-between py-3 px-4 bg-surface-1 rounded-md border border-border mb-3">
          <div className="flex items-center gap-3">
            {state?.locked ? (
              <Lock className="w-4 h-4 text-destructive" />
            ) : (
              <Unlock className="w-4 h-4 text-success" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {state?.locked ? 'Submissions Locked' : 'Submissions Open'}
              </p>
              <p className="text-xs text-muted-foreground">
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
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${state?.locked ? 'bg-success-soft text-success hover:bg-success/20' : 'bg-destructive-soft text-destructive hover:bg-destructive/20'}`}
          >
            {state?.locked ? 'Unlock' : 'Lock'}
          </button>
        </div>

        <div className="bg-surface-1 rounded-md border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-4 h-4 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">Rounds</p>
              <p className="text-xs text-muted-foreground">
                {state?.unlockedRound ? `Round ${state.unlockedRound} is currently unlocked` : 'No round is currently unlocked'}
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
                className={`px-4 py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${state?.unlockedRound === round ? 'bg-accent-soft text-accent hover:bg-accent/20' : 'bg-surface-3 hover:bg-surface-4 text-foreground border border-border'}`}
              >
                Round {round} {state?.unlockedRound === round ? '(Active)' : 'Locked'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === 'lock' ? 'Lock Submissions' : confirmAction?.type === 'lock-all-rounds' ? 'Lock All Rounds' : 'End Competition'}
        message={
          confirmAction?.type === 'lock'
            ? 'This will prevent all participants from submitting new solutions. Are you sure?'
            : confirmAction?.type === 'lock-all-rounds'
              ? 'This will lock the currently unlocked round. Participants will not be able to submit to any round. Are you sure?'
              : 'This will mark the competition as ended. No further submissions or changes will be possible for participants. Are you sure?'
        }
        confirmLabel={confirmAction?.type === 'lock' ? 'Lock Submissions' : confirmAction?.type === 'lock-all-rounds' ? 'Lock Round' : 'End Competition'}
        variant={confirmAction?.type === 'lock' ? 'warning' : 'danger'}
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
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
          <Snowflake className="w-4 h-4 text-info" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Leaderboard Controls</h2>
          <p className="text-xs text-muted-foreground">Freeze/unfreeze results and export data</p>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 px-4 bg-surface-1 rounded-md border border-border mb-3">
        <div className="flex items-center gap-3">
          {state?.leaderboardFrozen ? (
            <Snowflake className="w-4 h-4 text-info" />
          ) : (
            <Eye className="w-4 h-4 text-success" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {state?.leaderboardFrozen ? 'Leaderboard Frozen' : 'Leaderboard Live'}
            </p>
            <p className="text-xs text-muted-foreground">
              {state?.leaderboardFrozen ? 'Results are frozen — showing snapshot' : 'Showing live results'}
            </p>
          </div>
        </div>
        <button
          onClick={() => freezeMutation.mutate()}
          disabled={freezeMutation.isPending}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${state?.leaderboardFrozen ? 'bg-warning-soft text-warning hover:bg-warning/20' : 'bg-info-soft text-info hover:bg-info/20'}`}
        >
          {freezeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : state?.leaderboardFrozen ? 'Unfreeze' : 'Freeze'}
        </button>
      </div>

      <button
        onClick={handleExport}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-md bg-surface-3 hover:bg-surface-4 border border-border text-sm text-foreground transition-colors"
      >
        <Download className="w-4 h-4 text-success" />
        Export CSV
      </button>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive mt-2">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick Nav Cards
// ---------------------------------------------------------------------------

function QuickNavCards() {
  const navItems = [
    { to: '/admin/challenges', icon: Swords, label: 'Challenges', desc: 'Create, edit, and manage CSS challenges', tint: 'text-brand' },
    { to: '/admin/submissions', icon: FileText, label: 'Submissions', desc: 'Review, rejudge, and manage submissions', tint: 'text-accent' },
    { to: '/admin/participants', icon: Users, label: 'Participants', desc: 'Add, edit, and manage participants', tint: 'text-success' },
  ];

  return (
    <div className="space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex items-center justify-between w-full px-4 py-3.5 rounded-md bg-card border border-border hover:bg-surface-2 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-surface-3 border border-border flex items-center justify-center">
              <item.icon className={`w-4 h-4 ${item.tint}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand transition-colors" />
        </Link>
      ))}
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
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand" />
        <p>Loading admin dashboard…</p>
      </div>
    );
  }

  if (isError || !state) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-4" />
        <p className="text-destructive">Failed to load competition state.</p>
        <button onClick={() => refetch()} className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Overview and quick controls for the competition</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile icon={Swords} label="Challenges" value={stats?.totalChallenges ?? '—'} accent="brand" />
        <StatTile icon={Users} label="Participants" value={stats?.totalParticipants ?? '—'} accent="success" />
        <StatTile icon={FileText} label="Submissions" value={stats?.totalSubmissions ?? '—'} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <CompetitionControls state={state} onRefresh={() => refetch()} />
          <LeaderboardControls state={state} onRefresh={() => refetch()} />
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md border border-border bg-surface-3 flex items-center justify-center">
                <Target className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Quick Navigation</h2>
                <p className="text-xs text-muted-foreground">Access other admin sections</p>
              </div>
            </div>
            <QuickNavCards />
          </Card>

          <AdminParticipantManagementInline />
        </div>
      </div>
    </div>
  );
}
