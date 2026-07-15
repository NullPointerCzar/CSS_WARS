import { useState, useEffect, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api.js';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Flag,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  User,
  Target,
  Clock,
  Award,
  Maximize2,
  Minimize2,
  RefreshCw,
  Monitor,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Submission {
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
  reviewStatus: string;
  overrideScore: number | null;
  reviewNotes: string | null;
  reviewedAt?: string;
  flaggedForReview: boolean;
  user: { id: string; name: string; rollNumber: string | null };
  challenge: {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    roundNumber: number;
    targetImageUrl: string;
  };
}

interface SubmissionListItem {
  id: string;
}

// ---------------------------------------------------------------------------
// Metadata Card
// ---------------------------------------------------------------------------

function MetaCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: ReactNode;
  label: string;
  value: string | ReactNode;
  subValue?: string;
}) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm text-foreground font-medium">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score, overrideScore }: { score: number | null; overrideScore: number | null }) {
  const display = overrideScore ?? score;
  if (display === null) return <span className="text-muted-foreground">—</span>;

  const color =
    display >= 90
      ? 'text-success bg-success/10 border-success/20'
      : display >= 75
        ? 'text-accent bg-accent/10 border-accent/20'
        : display >= 50
          ? 'text-warning bg-warning/10 border-warning/20'
          : 'text-destructive bg-destructive/10 border-destructive/20';

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${color}`}>
      <Award className="w-5 h-5" />
      <span className="text-2xl font-bold font-mono">{display.toFixed(1)}%</span>
      {overrideScore !== null && <span className="text-[10px] text-warning">(overridden)</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare Section
// ---------------------------------------------------------------------------

function CompareSection({
  targetUrl,
  screenshotUrl,
  submission,
}: {
  targetUrl: string | null;
  screenshotUrl: string | null;
  submission: Submission;
}) {
  const [fullscreen] = useState<'target' | 'screenshot' | null>(null);
  const [zoomTarget, setZoomTarget] = useState(false);
  const [zoomSub, setZoomSub] = useState(false);

  const ImagePanel = ({
    src,
    alt,
    label,
    isZoomed,
    onToggleZoom,
  }: {
    src: string;
    alt: string;
    label: string;
    isZoomed: boolean;
    onToggleZoom: () => void;
  }) => (
    <div className={`flex flex-col bg-surface-1 rounded-xl overflow-hidden border border-border ${isZoomed ? 'col-span-full row-span-full absolute inset-0 z-10' : ''}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-surface-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleZoom}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-4 transition-colors"
            title={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            {isZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-[repeating-conic-gradient(#1a1d22_0%_25%,#101114_0%_50%)_50%/20px_20px]">
        <img
          src={src}
          alt={alt}
          className={`max-w-full max-h-full object-contain ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in max-h-[300px]'}`}
          onClick={onToggleZoom}
          draggable={false}
        />
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div className={`grid grid-cols-2 gap-4 ${fullscreen ? '' : ''}`}>
        {targetUrl && (
          <ImagePanel
            src={targetUrl}
            alt="Target"
            label="Target Image"
            isZoomed={zoomTarget}
            onToggleZoom={() => setZoomTarget(!zoomTarget)}
          />
        )}
        {screenshotUrl ? (
          <ImagePanel
            src={screenshotUrl}
            alt="Submission screenshot"
            label="Submitted Screenshot"
            isZoomed={zoomSub}
            onToggleZoom={() => setZoomSub(!zoomSub)}
          />
        ) : (
          <div className="flex items-center justify-center bg-surface-1 rounded-xl border border-border min-h-[200px]">
            <p className="text-sm text-muted-foreground">No screenshot available</p>
          </div>
        )}
      </div>
      {/* Download button */}
      {screenshotUrl && (
        <a
          href={screenshotUrl}
          download={`submission-${submission.id.slice(0, 8)}.png`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 p-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm border border-border z-20"
          title="Download screenshot"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
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
  pending,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
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
        className="bg-surface-2 border border-border rounded-2xl p-6 shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            variant === 'danger' ? 'bg-destructive/10' : 'bg-warning/10'
          }`}>
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
            className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-foreground transition-colors disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-destructive hover:brightness-110'
                : 'bg-warning hover:brightness-110'
            }`}
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sticky Header
// ---------------------------------------------------------------------------

function StickyHeader({
  submission,
  prevSubmission,
  nextSubmission,
  currentIndex,
  totalCount,
}: {
  submission: Submission;
  prevSubmission: SubmissionListItem | null;
  nextSubmission: SubmissionListItem | null;
  currentIndex: number;
  totalCount: number;
}) {
  return (
    <div className="sticky top-0 z-30 bg-surface-1/90 backdrop-blur-xl border-b border-border -mx-8 -mt-6 px-8 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/admin/submissions"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors shrink-0"
            title="Back to submissions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {submission.user.name}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {submission.challenge.title} · Round {submission.challenge.roundNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Prev/Next navigation */}
          <div className="flex items-center gap-1">
            {prevSubmission ? (
              <Link
                to={`/admin/submissions/${prevSubmission.id}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground cursor-not-allowed">
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1}/{totalCount}
            </span>
            {nextSubmission ? (
              <Link
                to={`/admin/submissions/${nextSubmission.id}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground cursor-not-allowed">
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState('');
  const [overrideScore, setOverrideScore] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch submission
  const { data: submission, isLoading: subLoading, isError: subError } = useQuery<Submission>({
    queryKey: ['admin-submission', id],
    queryFn: () => apiGet(`/api/admin/submissions/${id}`),
    enabled: !!id,
  });

  // Fetch nav siblings
  const { data: challengeSubmissions = [] } = useQuery<SubmissionListItem[]>({
    queryKey: ['admin-submissions-nav', submission?.challenge?.id],
    queryFn: () => apiGet(`/api/admin/submissions?challengeId=${submission!.challenge.id}`),
    enabled: !!submission?.challenge?.id,
  });

  const currentIndex = challengeSubmissions.findIndex((s) => s.id === id);
  const prevSubmission = currentIndex > 0 ? challengeSubmissions[currentIndex - 1] : null;
  const nextSubmission = currentIndex < challengeSubmissions.length - 1 ? challengeSubmissions[currentIndex + 1] : null;

  // Initialize form fields from submission data
  useEffect(() => {
    if (submission?.reviewNotes) setNotes(submission.reviewNotes);
    if (submission?.overrideScore != null) setOverrideScore(String(submission.overrideScore));
  }, [submission?.reviewNotes, submission?.overrideScore]);

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: {
      reviewStatus?: string;
      overrideScore?: number | null;
      reviewNotes?: string | null;
      flaggedForReview?: boolean;
    }) => apiPatch(`/api/admin/submissions/${id}/review`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submission', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-submissions-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-submissions-nav'] });
    },
  });

  // Rejudge mutation
  const rejudgeMutation = useMutation({
    mutationFn: () => apiPost(`/api/admin/submissions/${id}/rejudge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submission', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-submissions-all'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/admin/submissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submissions-all'] });
      navigate('/admin/submissions');
    },
  });

  const handleApprove = () => reviewMutation.mutate({ reviewStatus: 'APPROVED', flaggedForReview: false });
  const handleReject = () => reviewMutation.mutate({ reviewStatus: 'REJECTED', flaggedForReview: false });
  const handleFlag = () => {
    reviewMutation.mutate({
      reviewStatus: submission?.flaggedForReview ? 'PENDING' : 'FLAGGED',
      flaggedForReview: !submission?.flaggedForReview,
    });
  };

  const handleSaveNotes = () => {
    reviewMutation.mutate({ reviewNotes: notes || null });
  };

  const handleOverrideScore = () => {
    const val = overrideScore === '' ? null : Number(overrideScore);
    if (val !== null && (Number.isNaN(val) || val < 0 || val > 100)) return;
    reviewMutation.mutate({ overrideScore: val });
  };

  // Loading state
  if (subLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand" />
        <p className="text-sm">Loading submission...</p>
      </div>
    );
  }

  // Error state
  if (subError || !submission) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive">Submission not found</p>
        <Link to="/admin/submissions" className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to submissions
        </Link>
      </div>
    );
  }

  const targetUrl = submission.challenge.targetImageUrl;
  const screenshotUrl = submission.screenshotUrl;

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky Header */}
      <StickyHeader
        submission={submission}
        prevSubmission={prevSubmission}
        nextSubmission={nextSubmission}
        currentIndex={currentIndex}
        totalCount={challengeSubmissions.length}
      />

      <div className="flex-1 py-6 space-y-6">
        {/* Top section: metadata row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetaCard
            icon={<User className="w-3.5 h-3.5" />}
            label="Participant"
            value={submission.user.name}
            subValue={submission.user.rollNumber ?? undefined}
          />
          <MetaCard
            icon={<Target className="w-3.5 h-3.5" />}
            label="Challenge"
            value={`${submission.challenge.title}`}
            subValue={`Round ${submission.challenge.roundNumber} · ${submission.challenge.difficulty}`}
          />
          <MetaCard
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Submitted"
            value={
              <span className="font-mono">
                {new Date(submission.submittedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            }
            subValue={new Date(submission.submittedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          />
          <MetaCard
            icon={<Monitor className="w-3.5 h-3.5" />}
            label="Code Size"
            value={`${(submission.codeLength / 1024).toFixed(1)} KB`}
            subValue={`${submission.codeLength} bytes`}
          />
        </div>

        {/* Score row */}
        <div className="flex items-center gap-4">
          <ScoreBadge score={submission.score} overrideScore={submission.overrideScore} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              submission.reviewStatus === 'APPROVED' ? 'text-success bg-success/10' :
              submission.reviewStatus === 'REJECTED' ? 'text-destructive bg-destructive/10' :
              submission.reviewStatus === 'FLAGGED' ? 'text-warning bg-warning/10' :
              'text-foreground bg-muted-foreground/10'
            }`}>
              {submission.reviewStatus}
            </span>
          </div>
          {submission.isBest && (
            <span className="text-[10px] font-medium text-success bg-success/15 px-2 py-0.5 rounded-md">
              BEST SUBMISSION
            </span>
          )}
        </div>

        {/* Main content: comparison + code */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left: Image Comparison */}
          <div className="xl:col-span-3">
            <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-surface-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Comparison</h3>
              </div>
              <div className="p-4">
                <CompareSection
                  targetUrl={targetUrl}
                  screenshotUrl={screenshotUrl}
                  submission={submission}
                />
              </div>
            </div>
          </div>

          {/* Right: Code + Actions */}
          <div className="xl:col-span-2 space-y-4">
            {/* Action buttons */}
            <div className="bg-surface-2 border border-border rounded-2xl p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-success/20 hover:bg-success/30 text-success text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Reject
                </button>
                <button
                  onClick={handleFlag}
                  disabled={reviewMutation.isPending}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-warning/20 hover:bg-warning/30 text-warning text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Flag className={`w-4 h-4 ${submission.flaggedForReview ? 'fill-current' : ''}`} />
                  {submission.flaggedForReview ? 'Unflag' : 'Flag'}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>

              {/* Override score */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  placeholder="Override score"
                  className="flex-1 bg-surface-1 border border-border text-foreground text-sm rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand font-mono placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleOverrideScore}
                  disabled={reviewMutation.isPending}
                  className="px-3 py-2 rounded-xl bg-brand/20 hover:bg-brand/30 text-brand text-sm transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
              </div>

              {/* Notes */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reviewer notes..."
                  className="flex-1 bg-surface-1 border border-border text-foreground text-sm rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNotes();
                  }}
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={reviewMutation.isPending}
                  className="px-3 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-foreground text-sm transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Rejudge */}
            <div className="bg-surface-2 border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejudge</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Re-run rendering and scoring</p>
                </div>
                <button
                  onClick={() => rejudgeMutation.mutate()}
                  disabled={rejudgeMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand/20 hover:bg-brand/30 text-brand text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {rejudgeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Re-run
                </button>
              </div>
              {submission.rejudgedAt && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Last rejudged: {new Date(submission.rejudgedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Code Section */}
        <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-surface-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Submitted Code</h3>
            <span className="text-xs text-muted-foreground">{submission.codeLength.toLocaleString()} bytes</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* HTML */}
            <div className="min-h-[300px]">
              <div className="px-4 py-2 bg-surface-3 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">HTML</span>
              </div>
              <div className="h-[350px]">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={submission.htmlCode || ''}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    automaticLayout: true,
                    padding: { top: 12 },
                    domReadOnly: true,
                    contextmenu: false,
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full bg-surface-1">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                />
              </div>
            </div>
            {/* CSS */}
            <div className="min-h-[300px]">
              <div className="px-4 py-2 bg-surface-3 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">CSS</span>
              </div>
              <div className="h-[350px]">
                <Editor
                  height="100%"
                  defaultLanguage="css"
                  value={submission.cssCode || ''}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    automaticLayout: true,
                    padding: { top: 12 },
                    domReadOnly: true,
                    contextmenu: false,
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full bg-surface-1">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Submission"
        message="Are you sure you want to permanently delete this submission? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
