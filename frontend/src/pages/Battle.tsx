import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Circle,
  Eye,
  Send,
  ImageIcon,
} from 'lucide-react';
import { useIdentity } from '../lib/identity.js';
import { MonacoEditor } from '../components/Editor/MonacoEditor.js';
import { LivePreview } from '../components/Preview/LivePreview.js';
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
  EASY: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Easy' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Medium' },
  HARD: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Hard' },
};

const STORAGE_PREFIX = 'cssbattle_draft_';

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
  const { data: competitionState } = useQuery<{ locked: boolean; status: string }>({
    queryKey: ['competition-state'],
    queryFn: async () => {
      const res = await fetch('/api/competition/state');
      if (!res.ok) throw new Error('Failed to fetch competition state');
      return res.json();
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const isLocked = competitionState?.locked ?? true;

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
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
        <p>Loading challenge...</p>
      </div>
    );
  }

  if (isError || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400">Challenge not found.</p>
        <button
          onClick={() => navigate('/challenges')}
          className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
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
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/challenges"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Challenges
          </Link>
          <div className="w-px h-6 bg-slate-800" />
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{challenge.title}</h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color}`}>
              <Circle className="w-1.5 h-1.5 fill-current" />
              {cfg.label}
            </span>
            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
              Round {challenge.roundNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {submitError && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 max-w-[200px] truncate">{submitError}</span>
              </div>
            )}
            {isLocked && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400">Submissions closed</span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isSubmitting
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : !canSubmit
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95'
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

      {/* ─── Main content: editor | target + preview ─── */}
      <div className="flex-1 flex min-h-0">
        {/* ─── Editor panel (wider — 60%) ─── */}
        <div className="w-3/5 flex flex-col border-r border-slate-800">
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
              <div className="flex items-center justify-center h-full text-slate-500">
                Please log in to edit
              </div>
            )}
          </div>
        </div>

        {/* ─── Right panel (40%) — target image on top, preview below ─── */}
        <div className="w-2/5 flex flex-col bg-slate-950 overflow-y-auto">
          {/* ─── Target image (4:3 viewport, never stretched) ─── */}
          <div className="flex flex-col border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0 bg-slate-900/50">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                Target
              </span>
              <span className="text-[10px] text-slate-500">Reference</span>
            </div>
            <div className="aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
              {targetImageError ? (
                <div className="flex flex-col items-center gap-2 text-amber-400 px-4 text-center">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                  <p className="text-xs">Target image failed to load</p>
                  <p className="text-[10px] text-slate-500">
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
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0 bg-slate-900/50">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Preview
              </span>
            </div>
            <div className="aspect-[4/3] w-full bg-slate-950 relative overflow-hidden">
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
    </div>
  );
}
