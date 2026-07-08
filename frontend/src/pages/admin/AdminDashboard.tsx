import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getAdminPin, setAdminPin } from '../../lib/config.js';
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
  ChevronDown,
  FileCode2,
  RotateCw,
  Eye,
  ArrowUpCircle,
  ShieldCheck,
} from 'lucide-react';
import { AdminParticipantManagement } from './AdminParticipantManagement.js';

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
  roundNumber: number;
}

interface AdminSubmission {
  id: string;
  userId: string;
  htmlCode: string;
  cssCode: string;
  codeLength: number;
  score: number | null;
  screenshotUrl: string | null;
  isBest: boolean;
  submittedAt: string;
  rejudgedAt?: string;
  user: {
    name: string;
    rollNumber: string | null;
  };
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
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
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
      const res = await fetch('/api/admin/competition/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      const res = await fetch('/api/admin/competition/lock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ locked }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const roundMutation = useMutation({
    mutationFn: async (round: number) => {
      const res = await fetch('/api/admin/competition/round', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ currentRound: round }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
  });

  const handleAction = useCallback((type: string, payload?: any) => {
    const destructiveActions = ['ENDED'];
    if (destructiveActions.includes(payload?.status ?? type)) {
      setConfirmAction({ type, payload });
      return;
    }
    executeAction(type, payload);
  }, []);

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
    }
    setConfirmAction(null);
  }, [statusMutation, lockMutation, roundMutation]);

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
        <div className="flex items-center justify-between py-3 px-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-white">Current Round</p>
              <p className="text-xs text-slate-500">Round {state?.currentRound ?? 1}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('round', { round: (state?.currentRound ?? 1) - 1 })}
              disabled={isPending || (state?.currentRound ?? 1) <= 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-30"
            >
              −
            </button>
            <button
              onClick={() => handleAction('round', { round: (state?.currentRound ?? 1) + 1 })}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === 'lock' ? 'Lock Submissions' : 'End Competition'}
        message={
          confirmAction?.type === 'lock'
            ? 'This will prevent all participants from submitting new solutions. Are you sure?'
            : 'This will mark the competition as ended. No further submissions or changes will be possible for participants. Are you sure?'
        }
        confirmLabel={confirmAction?.type === 'lock' ? 'Lock Submissions' : 'End Competition'}
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
      const res = await fetch('/api/admin/leaderboard/freeze', {
        method: 'PATCH',
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition-state'] });
      onRefresh();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/leaderboard/export', {
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cssbattle-leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
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
// Submission Review Section
// ---------------------------------------------------------------------------

function SubmissionReview() {
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [rejudgeError, setRejudgeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch challenges
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['admin-all-challenges'],
    queryFn: async () => {
      const res = await fetch('/api/admin/challenges', {
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    },
  });

  // Auto-select first challenge
  useEffect(() => {
    if (!selectedChallengeId && challenges.length > 0) {
      setSelectedChallengeId(challenges[0].id);
    }
  }, [selectedChallengeId, challenges]);

  const selectedChallenge = challenges.find((c) => c.id === selectedChallengeId);

  // Fetch submissions
  const {
    data: submissions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<AdminSubmission[]>({
    queryKey: ['admin-submissions', selectedChallengeId],
    queryFn: async () => {
      if (!selectedChallengeId) return [];
      const res = await fetch(`/api/admin/submissions?challengeId=${selectedChallengeId}`, {
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    },
    enabled: !!selectedChallengeId,
  });

  // Rejudge mutation
  const rejudgeMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await fetch(`/api/admin/submissions/${submissionId}/rejudge`, {
        method: 'POST',
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Rejudge failed');
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setRejudgeError(null);
    },
    onError: (err: Error) => setRejudgeError(err.message),
  });

  // Filter submissions by search query
  const filteredSubmissions = searchQuery
    ? submissions.filter(
        (s) =>
          s.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.user.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : submissions;

  const toggleExpand = (id: string) => {
    setExpandedSubmissionId(expandedSubmissionId === id ? null : id);
  };

  return (
    <SectionCard
      icon={<FileCode2 className="w-4 h-4 text-purple-400" />}
      title="Submission Review"
      description="View, inspect, and rejudge participant submissions"
    >
      {/* Challenge selector + search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <select
            value={selectedChallengeId ?? ''}
            onChange={(e) => setSelectedChallengeId(e.target.value)}
            className="appearance-none w-full bg-slate-950/50 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 cursor-pointer"
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                Round {c.roundNumber} — {c.title}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          className="bg-slate-950/50 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 w-48 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-600"
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {rejudgeError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20"
          >
            {rejudgeError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center justify-center py-12 text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">Failed to load submissions</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filteredSubmissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <FileCode2 className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No submissions yet</p>
          {!selectedChallenge && <p className="text-xs mt-1">Select a challenge to view submissions</p>}
        </div>
      )}

      {/* Submissions list */}
      {!isLoading && !isError && filteredSubmissions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 mb-2">
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
          </div>
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden transition-all"
            >
              {/* Summary row */}
              <button
                onClick={() => toggleExpand(sub.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
              >
                <ChevronRight
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    expandedSubmissionId === sub.id ? 'rotate-90' : ''
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white">{sub.user.name}</span>
                  {sub.user.rollNumber && (
                    <span className="text-xs text-slate-500 ml-2">{sub.user.rollNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Score */}
                  {sub.score !== null ? (
                    <span className={`font-mono text-sm font-bold ${
                      sub.score >= 90 ? 'text-emerald-400' :
                      sub.score >= 75 ? 'text-blue-400' :
                      sub.score >= 50 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {sub.score.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                  {sub.isBest && (
                    <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                      BEST
                    </span>
                  )}
                  {sub.rejudgedAt && (
                    <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-xs text-slate-500 font-mono">
                    {sub.codeLength.toLocaleString()} B
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedSubmissionId === sub.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-800/50"
                  >
                    <div className="p-4 space-y-4">
                      {/* Code display */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">HTML</p>
                          <pre className="text-xs text-slate-300 bg-slate-950 rounded-lg p-3 overflow-x-auto max-h-40 border border-slate-800/50 font-mono">
                            {sub.htmlCode || '<empty>'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">CSS</p>
                          <pre className="text-xs text-slate-300 bg-slate-950 rounded-lg p-3 overflow-x-auto max-h-40 border border-slate-800/50 font-mono">
                            {sub.cssCode || '<empty>'}
                          </pre>
                        </div>
                      </div>

                      {/* Screenshot */}
                      {sub.screenshotUrl && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Screenshot</p>
                          <div className="bg-white rounded-lg overflow-hidden border border-slate-800/50 inline-block max-h-32">
                            <img
                              src={sub.screenshotUrl}
                              alt="Submission screenshot"
                              className="h-28 object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => rejudgeMutation.mutate(sub.id)}
                          disabled={rejudgeMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {rejudgeMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                          )}
                          Rejudge
                        </button>
                        <span className="text-[10px] text-slate-600">
                          Submitted {new Date(sub.submittedAt).toLocaleString()}
                        </span>
                        {sub.rejudgedAt && (
                          <span className="text-[10px] text-amber-600">
                            · Rejudged {new Date(sub.rejudgedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Admin Dashboard — Main Page
// ---------------------------------------------------------------------------

function AdminPinPrompt({ onPinSet }: { onPinSet: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-check PIN against backend on entry
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsChecking(true);

    try {
      // Verify PIN by calling a read-only admin endpoint
      const res = await fetch('/api/admin/challenges', {
        headers: { 'x-admin-pin': pin },
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error('Incorrect admin PIN');
      }

      // PIN is valid — store it
      setAdminPin(pin);
      onPinSet();
    } catch (err: any) {
      setError(err.message || 'Failed to verify PIN');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 mx-auto flex items-center justify-center mb-4">
          <ShieldCheck className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Admin Authentication</h2>
        <p className="text-sm text-slate-400 mb-6">
          Enter the shared admin PIN to access the control panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter admin PIN"
            className="w-full text-center text-2xl tracking-[0.5em] bg-slate-950/50 border border-slate-800 text-white rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
            maxLength={4}
            autoFocus
            required
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isChecking || pin.length < 4}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Unlock Dashboard'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function AdminDashboard() {
  const [pinVerified, setPinVerified] = useState(!!getAdminPin());

  if (!pinVerified) {
    return <AdminPinPrompt onPinSet={() => setPinVerified(true)} />;
  }

  const {
    data: state,
    isLoading,
    isError,
    refetch,
  } = useQuery<CompetitionState>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    refetchInterval: 10_000,
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">Control panel for competition management</p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <CompetitionControls state={state} onRefresh={() => refetch()} />
          <LeaderboardControls state={state} onRefresh={() => refetch()} />

          <AdminParticipantManagement />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SubmissionReview />

          {/* Challenge Management Link */}
          <SectionCard
            icon={<Swords className="w-4 h-4 text-amber-400" />}
            title="Challenge Management"
            description="Create, edit, publish, and manage CSS challenges"
          >
            <Link
              to="/admin/challenges"
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-colors group"
            >
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                Open Challenge Manager
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </Link>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
