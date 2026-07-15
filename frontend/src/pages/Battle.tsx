import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  Send,
  ImageIcon,
  Lock,
  Play,
  Timer,
} from 'lucide-react';
import { useIdentity } from '../lib/identity.js';
import { Badge } from '@/components/ui/badge';
import { MonacoEditor } from '../components/Editor/MonacoEditor.js';
import { LivePreview } from '../components/Preview/LivePreview.js';
import { ColorPalette } from '../components/Preview/ColorPalette.js';
import {
  CompareModeToggle,
  CompareView,
  setPreviewCode,
  type CompareMode,
} from '../components/CompareTools/CompareModes.js';
import {
  SubmissionResult,
  type SubmissionResultData,
} from '../components/Submission/SubmissionResult.js';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  targetImageUrl: string;
  roundNumber: number;
}

const difficultyConfig = {
  EASY: { variant: 'success' as const, label: 'Easy' },
  MEDIUM: { variant: 'warning' as const, label: 'Medium' },
  HARD: { variant: 'danger' as const, label: 'Hard' },
};

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const STORAGE_PREFIX = 'csswars_draft_';
const TIMER_PREFIX = 'csswars_timer_';

function loadDraft(userId: string, challengeId: string): { html: string; css: string } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}_${challengeId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Restore the challenge start timestamp (ms epoch) so the timer survives a
 * page refresh. Returns null if absent or invalid (e.g. a future timestamp).
 */
function loadTimerStart(userId: string, challengeId: string): number | null {
  try {
    const raw = localStorage.getItem(`${TIMER_PREFIX}${userId}_${challengeId}`);
    if (!raw) return null;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts <= 0 || ts > Date.now()) return null;
    return ts;
  } catch {
    return null;
  }
}

function saveTimerStart(userId: string, challengeId: string, ts: number): void {
  try {
    localStorage.setItem(`${TIMER_PREFIX}${userId}_${challengeId}`, String(ts));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

function clearTimerStart(userId: string, challengeId: string): void {
  try {
    localStorage.removeItem(`${TIMER_PREFIX}${userId}_${challengeId}`);
  } catch {
    /* ignore */
  }
}

const DEFAULT_HTML = `<div class="box"></div>`;
const DEFAULT_CSS = `.box {\n  /* Your CSS here */\n}`;

export function Battle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const identity = useIdentity();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [compareMode, setCompareMode] = useState<CompareMode>('normal');
  const [initialized, setInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmissionResultData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number>(0);
  const [targetImageError, setTargetImageError] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [locallySubmitted, setLocallySubmitted] = useState(false);
  const lastSubmitRef = useRef<AbortController | null>(null);
  // Mirrors `hasSubmitted` for use inside event handlers (avoids a forward
  // reference / stale-closure dependency on the derived value).
  const hasSubmittedRef = useRef(false);

  const { data: challenge, isLoading, isError } = useQuery<Challenge>({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) throw new Error('Failed to fetch challenge');
      return res.json();
    },
    enabled: !!id,
  });

  /**
   * Start the challenge timer. Idempotent: the first call wins and fixes the
   * start timestamp; subsequent calls (including auto-start on edit) are no-ops.
   * The timer can be started either by clicking "Start Challenge" or
   * automatically the moment the participant edits the HTML or CSS. The start
   * is persisted to localStorage so a page refresh doesn't reset the timer.
   */
  const startTimer = useCallback(() => {
    // Once a submission exists for this challenge, the timer can never start.
    if (hasSubmittedRef.current) return;
    setStartedAt((prev) => {
      if (prev !== null) return prev;
      const ts = Date.now();
      // identity/challenge are stable by the time the user can start
      if (identity && challenge) saveTimerStart(identity.id, challenge.id, ts);
      return ts;
    });
  }, [identity, challenge]);

  // Load draft (and restore the timer start) from localStorage on first mount
  useEffect(() => {
    if (!challenge || !identity || initialized) return;
    const draft = loadDraft(identity.id, challenge.id);
    if (draft) {
      setHtmlCode(draft.html);
      setCssCode(draft.css);
    }
    // Restore the timer so a refresh doesn't reset the participant's elapsed
    // time. The actual solveTimeMs is recomputed from this timestamp on submit.
    const restored = loadTimerStart(identity.id, challenge.id);
    if (restored !== null) {
      setStartedAt(restored);
    }
    setInitialized(true);
  }, [challenge, identity, initialized]);

  const handleHtmlChange = useCallback((html: string) => {
    startTimer();
    setHtmlCode(html);
  }, [startTimer]);

  const handleCssChange = useCallback((css: string) => {
    startTimer();
    setCssCode(css);
  }, [startTimer]);

  // Keep the module-level store in sync with the current editor code
  // so DiffMode can send it to the Playwright render service
  useEffect(() => {
    setPreviewCode(htmlCode, cssCode);
  }, [htmlCode, cssCode]);

  // Tick the elapsed timer once the challenge has started.
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [startedAt]);

  // Fetch competition state for lock check
  const { data: competitionState } = useQuery<{ locked: boolean; status: string; unlockedRound: number | null }>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const isGloballyLocked = competitionState?.locked ?? true;
  const isWrongRound = !competitionState?.unlockedRound || challenge?.roundNumber !== competitionState.unlockedRound;
  const isLocked = isGloballyLocked || isWrongRound;

  // Fetch this user's existing submissions for the challenge. A participant
  // may only submit once, so if one already exists we must NOT let them start
  // (or restart) the timer, and we surface the prior result instead.
  const { data: existingSubmissions } = useQuery<Array<{
    id: string;
    score: number | null;
    codeLength: number;
    isBest: boolean;
    screenshotUrl: string | null;
    submittedAt: string;
  }>>({
    queryKey: ['submissions-mine', identity?.id, id],
    queryFn: async () => {
      if (!identity || !id) return [];
      const params = new URLSearchParams({ userId: identity.id, challengeId: id });
      const res = await fetch(`/api/submissions/mine?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    },
    enabled: !!identity && !!id,
    staleTime: 30_000,
  });

  const hasSubmitted =
    locallySubmitted || (existingSubmissions?.length ?? 0) > 0;

  // Keep the ref in sync so startTimer() (called from editor keystrokes /
  // the Start button) sees the latest value without being in its deps.
  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);

  // Re-show the prior submission result on (re)load so a completed challenge
  // doesn't look like a fresh, re-attemptable one. Once dismissed, stay closed.
  useEffect(() => {
    if (hasSubmitted && !submitResult && !resultDismissed && existingSubmissions?.length) {
      const s = existingSubmissions[0];
      setSubmitResult({
        id: s.id,
        score: s.score,
        screenshotUrl: s.screenshotUrl,
        codeLength: s.codeLength,
        isBest: s.isBest,
        rank: null,
        pixelScore: null,
        byteScore: null,
        timeScore: null,
      });
    }
  }, [hasSubmitted, submitResult, resultDismissed, existingSubmissions]);

  const handleCloseResult = useCallback(() => {
    setSubmitResult(null);
    setResultDismissed(true);
  }, []);

  // Handle submission
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !identity || !challenge) return;

    const now = Date.now();
    if (now < rateLimitUntil) return;

    if (lastSubmitRef.current) {
      lastSubmitRef.current.abort();
    }

    const controller = new AbortController();
    lastSubmitRef.current = controller;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: identity.id,
          challengeId: challenge.id,
          htmlCode,
          cssCode,
          solveTimeMs: startedAt ? Date.now() - startedAt : 0,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? `Submission failed (${res.status})`);
      } else {
        setSubmitResult(data as SubmissionResultData);
        // One submission per challenge — the timer is no longer needed.
        setLocallySubmitted(true);
        clearTimerStart(identity.id, challenge.id);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setSubmitError(err.message ?? 'Submission failed');
    } finally {
      setIsSubmitting(false);
      setRateLimitUntil(Date.now() + 2000);
    }
  }, [identity, challenge, htmlCode, cssCode, isSubmitting, rateLimitUntil]);

  const canSubmit =
    !isSubmitting && !isLocked && !hasSubmitted && !!identity && startedAt !== null && Date.now() >= rateLimitUntil;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-warning" />
        <p>Loading challenge...</p>
      </div>
    );
  }

  if (isError || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive">Challenge not found.</p>
        <button
          onClick={() => navigate('/challenges')}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to challenges
        </button>
      </div>
    );
  }

  const cfg = difficultyConfig[challenge.difficulty];

  return (
    <div className="h-full flex flex-col -mx-6 -my-8">
      {/* ─── Top bar ─── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-1/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/challenges"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Challenges
          </Link>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">{challenge.title}</h1>
            <Badge variant={cfg.variant} size="sm">
              {cfg.label}
            </Badge>
            <span className="text-xs text-muted-foreground bg-surface-3 border border-border px-2 py-0.5 rounded">
              Round {challenge.roundNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {submitError && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive-soft border border-destructive/20">
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs text-destructive max-w-[200px] truncate">{submitError}</span>
              </div>
            )}
            {isWrongRound && !isGloballyLocked && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-3 border border-border">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Round {challenge.roundNumber} is locked</span>
              </div>
            )}

            {/* ─── Challenge timer: Start button OR live elapsed chip ─── */}
            {hasSubmitted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success/10 border border-success/20 text-success">
                <Send className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Submitted</span>
              </div>
            ) : (
              !isLocked &&
              (startedAt === null ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-surface-3 border border-border text-foreground hover:bg-surface-4 hover:border-brand/40 transition-all active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 text-brand" />
                  Start Challenge
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-3 border border-border text-foreground font-mono text-sm tabular-nums"
                  title="Time since you started this challenge"
                >
                  <Timer className="w-3.5 h-3.5 text-brand" />
                  {formatTime(elapsedMs)}
                </div>
              ))
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isSubmitting
                  ? 'bg-brand/50 text-brand-foreground cursor-not-allowed'
                  : !canSubmit
                    ? 'bg-surface-3 text-muted-foreground cursor-not-allowed'
                    : 'bg-brand hover:bg-brand/90 text-brand-foreground shadow-soft-md hover:shadow-focus active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scoring...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          </div>

          <CompareModeToggle mode={compareMode} onModeChange={setCompareMode} />
        </div>
      </div>

      {/* ─── Main content: editor | target + preview | palette ─── */}
      <div className="flex-1 flex min-h-0">
       <div className="flex-1 flex min-w-0">
        {/* ─── Editor panel (wider — 60%) ─── */}
        <div className="w-3/5 flex flex-col border-r border-border">
          <div className="flex-1 min-h-0 p-3">
            {identity ? (
              <MonacoEditor
                challengeId={challenge.id}
                userId={identity.id}
                htmlCode={htmlCode}
                cssCode={cssCode}
                onHtmlChange={handleHtmlChange}
                onCssChange={handleCssChange}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Please log in to edit
              </div>
            )}
          </div>
        </div>

        {/* ─── Right panel (40%) — target image on top, preview below ─── */}
        <div className="w-2/5 flex flex-col bg-surface-1 overflow-y-auto">
          {/* ─── Target image (4:3 viewport, never stretched) ─── */}
          <div className="flex flex-col border-b border-border shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-surface-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-brand" />
                Target
              </span>
              <span className="text-[10px] text-muted-foreground">Reference</span>
            </div>
            <div className="aspect-[4/3] bg-surface-1 flex items-center justify-center overflow-hidden">
              {targetImageError ? (
                <div className="flex flex-col items-center gap-2 text-brand px-4 text-center">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                  <p className="text-xs">Target image failed to load</p>
                  <p className="text-[10px] text-muted-foreground">
                    The admin may need to re-upload it.
                  </p>
                </div>
              ) : (
                <img
                  src={challenge.targetImageUrl}
                  alt="Target"
                  className="w-full h-full object-contain bg-white"
                  onError={() => setTargetImageError(true)}
                />
              )}
            </div>
          </div>

          {/* ─── Live preview — same 4:3 aspect ratio as target ─── */}
          <div className="flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-surface-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand" />
                Preview
              </span>
            </div>
            <div className="aspect-[4/3] w-full bg-surface-1 relative overflow-hidden">
              <div className={submitResult ? 'opacity-30 pointer-events-none absolute inset-0' : 'opacity-100 absolute inset-0'}>
                <CompareView
                  mode={compareMode}
                  targetImageUrl={challenge.targetImageUrl}
                >
                  <LivePreview
                    htmlCode={htmlCode}
                    cssCode={cssCode}
                    iframeRef={iframeRef}
                  />
                </CompareView>
              </div>

              {/* Submission result overlay */}
              <AnimatePresence>
                {submitResult && (
                  <div className="absolute inset-0 z-30 overflow-y-auto">
                  <SubmissionResult
                    result={submitResult}
                    targetImageUrl={challenge.targetImageUrl}
                    onClose={handleCloseResult}
                  />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
       </div>

        {/* ─── Color palette sidebar (far-right utility panel) ─── */}
        {!targetImageError && (
          <div className="w-20 shrink-0 flex flex-col border-l border-border bg-surface-1 min-h-0">
            <div className="flex items-center justify-center px-2 py-2 border-b border-border shrink-0 bg-surface-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Colors
              </span>
            </div>
            <ColorPalette imageUrl={challenge.targetImageUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
