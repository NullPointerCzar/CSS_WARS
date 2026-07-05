import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Circle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useIdentity } from '../lib/identity.js';
import { MonacoEditor } from '../components/Editor/MonacoEditor.js';
import { LivePreview } from '../components/Preview/LivePreview.js';
import {
  CompareModeToggle,
  CompareView,
  type CompareMode,
} from '../components/CompareTools/CompareModes.js';

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
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [initialized, setInitialized] = useState(false);

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
      {/* Top bar */}
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

        <CompareModeToggle mode={compareMode} onModeChange={setCompareMode} />
      </div>

      {/* Main content: editor + preview */}
      <div className="flex-1 flex min-h-0">
        {/* Editor panel */}
        <motion.div
          layout
          className={`flex flex-col border-r border-slate-800 ${
            isPreviewFullscreen ? 'w-0 overflow-hidden' : 'w-1/2'
          } transition-all duration-300`}
        >
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
        </motion.div>

        {/* Preview panel */}
        <motion.div
          layout
          className={`flex flex-col ${isPreviewFullscreen ? 'w-full' : 'w-1/2'} transition-all duration-300`}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                title={isPreviewFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isPreviewFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-950 p-3 min-h-0">
            <CompareView
              mode={compareMode}
              targetImageUrl={challenge.targetImageUrl}
              iframeRef={iframeRef}
            >
              <LivePreview
                htmlCode={htmlCode}
                cssCode={cssCode}
                iframeRef={iframeRef}
              />
            </CompareView>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
