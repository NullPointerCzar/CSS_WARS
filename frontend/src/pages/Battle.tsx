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

const STORAGE_PREFIX = 'csswars_draft_';

function loadDraft(userId: string, challengeId: string): { html: string; css: string } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}_${challengeId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
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
  const lastSubmitRef = useRef<AbortController | null>(null);

  const { data: challenge, isLoading, isError } = useQuery<Challenge>({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) throw new Error('Failed to fetch challenge');
      return res.json();
    },
    enabled: !!id,
  });

  // Load draft from localStorage on first mount
  useEffect(() => {
    if (!challenge || !identity || initialized) return;
    const draft = loadDraft(identity.id, challenge.id);
    if (draft) {
      setHtmlCode(draft.html);
      setCssCode(draft.css);
    }
    setInitialized(true);
  }, [challenge, identity, initialized]);

  const handleHtmlChange = useCallback((html: string) => {
    setHtmlCode(html);
  }, []);

  const handleCssChange = useCallback((css: string) => {
    setCssCode(css);
  }, []);

  // Keep the module-level store in sync with the current editor code
  // so DiffMode can send it to the Playwright render service
  useEffect(() => {
    setPreviewCode(htmlCode, cssCode);
  }, [htmlCode, cssCode]);

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
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? `Submission failed (${res.status})`);
      } else {
        setSubmitResult(data as SubmissionResultData);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setSubmitError(err.message ?? 'Submission failed');
    } finally {
      setIsSubmitting(false);
      setRateLimitUntil(Date.now() + 2000);
    }
  }, [identity, challenge, htmlCode, cssCode, isSubmitting, rateLimitUntil]);

  const canSubmit = !isSubmitting && !isLocked && !!identity && Date.now() >= rateLimitUntil;

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
                      onClose={() => setSubmitResult(null)}
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
