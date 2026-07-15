import { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal, Eye, Columns2, ScanLine } from 'lucide-react';

// ---------------------------------------------------------------------------
// Module-level editor code — set by Battle.tsx on every code change,
// read by DiffMode to submit to the rendering service.
// Avoids fragile DOM parsing of the iframe srcdoc.
// ---------------------------------------------------------------------------
let _currentPreviewCode: { html: string; css: string } = { html: '', css: '' };

export function setPreviewCode(html: string, css: string): void {
  _currentPreviewCode = { html, css };
}

function getPreviewCode(): { html: string; css: string } {
  return _currentPreviewCode;
}

export type CompareMode = 'normal' | 'split' | 'opacity' | 'diff';

// ---------------------------------------------------------------------------
// Compare mode toggle buttons
// ---------------------------------------------------------------------------
export function CompareModeToggle({
  mode,
  onModeChange,
}: {
  mode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
}) {
  const modes: { key: CompareMode; label: string; icon: React.ReactNode }[] = [
    { key: 'normal', label: 'Normal', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'split', label: 'Split', icon: <Columns2 className="w-3.5 h-3.5" /> },
    { key: 'opacity', label: 'Opacity', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { key: 'diff', label: 'Diff', icon: <ScanLine className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-1 bg-surface-3 rounded-lg p-1">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => onModeChange(m.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === m.key
              ? 'bg-brand/20 text-brand shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-4'
          }`}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Split Slider — follows cursor on hover, no click-and-drag required
// ---------------------------------------------------------------------------
function SplitSlider({
  targetImageUrl,
  isHovering,
}: {
  targetImageUrl: string;
  isHovering: boolean;
}) {
  const [splitPos, setSplitPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHovering) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(0, Math.min(100, pos)));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovering]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-10 select-none transition-opacity duration-200 ${
        isHovering ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ cursor: 'col-resize' }}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - splitPos}% 0 0)`,
        }}
      >
        <img
          src={targetImageUrl}
          alt="Target"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-brand shadow-lg shadow-brand/50 z-20 pointer-events-none"
        style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opacity Slider — range input controlling overlay opacity, visible only on hover
// ---------------------------------------------------------------------------
function OpacitySlider({
  targetImageUrl,
  isHovering,
}: {
  targetImageUrl: string;
  isHovering: boolean;
}) {
  const [opacity, setOpacity] = useState(50);

  return (
    <div
      className={`absolute inset-0 z-10 transition-opacity duration-200 ${
        isHovering ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="pointer-events-none w-full h-full">
        <img
          src={targetImageUrl}
          alt="Target"
          className="w-full h-full object-contain"
          style={{ opacity: opacity / 100 }}
          draggable={false}
        />
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-surface-2 backdrop-blur-sm rounded-lg px-4 py-2 border border-border min-w-[200px]">
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full h-1.5 bg-surface-4 rounded-full appearance-none cursor-pointer accent-brand [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-muted-foreground font-mono w-8 text-right shrink-0">
          {opacity}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Difference Mode — server-rendered screenshot + server-side pixel diff
//
// Flow:
//   1. On code change (debounced), POST {html, css, targetImageUrl} to /render
//      (the isolated rendering service). The response includes a screenshotUrl
//      at /uploads/submissions/submission-{id}.png and a score.
//   2. With the screenshot in hand, POST {screenshotUrl, targetImageUrl} to
//      /diff, which returns a PNG with the diff overlay. We also read the
//      match-% out of the X-Diff-Score response header.
//   3. The result is rendered as an <img> so the canvas isn't tainted by
//      cross-origin fetches. The diff re-runs whenever the code changes,
//      so the participant gets live feedback like the original task spec
//      asked for.
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 700;

function DiffMode({
  targetImageUrl,
}: {
  targetImageUrl: string;
}) {
  const [diffUrl, setDiffUrl] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRunOnce, setHasRunOnce] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDiff = useCallback(async () => {
    // Cancel any in-flight render before starting a new one
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsComputing(true);
    setError(null);

    try {
      const { html, css } = getPreviewCode();
      if (!html && !css) {
        throw new Error('Type some HTML or CSS first to see a diff');
      }

      const tempId = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 1. Render via the rendering service — gives us a screenshot URL
      const renderRes = await fetch('/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          css,
          targetImageUrl,
          submissionId: tempId,
        }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      if (!renderRes.ok) {
        const body = await renderRes.json().catch(() => ({}));
        throw new Error(body.error || `Render service returned ${renderRes.status}`);
      }

      const renderData = await renderRes.json();
      if (!renderData.success) {
        throw new Error(renderData.error || 'Render failed');
      }

      const screenshotUrl: string | undefined = renderData.screenshotUrl;
      if (!screenshotUrl) {
        throw new Error('No screenshot URL returned by the render service');
      }

      // 2. Ask the render service for a diff PNG of that screenshot
      const diffRes = await fetch('/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshotUrl, targetImageUrl }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      if (!diffRes.ok) {
        const body = await diffRes.json().catch(() => ({}));
        throw new Error(body.error || `Diff service returned ${diffRes.status}`);
      }

      // Read score from the header so we don't need to re-pixelmatch on the client
      const headerScore = diffRes.headers.get('X-Diff-Score');
      if (headerScore) {
        const parsed = Number(headerScore);
        if (!Number.isNaN(parsed)) setScore(parsed);
      } else {
        setScore(renderData.score ?? null);
      }

      // 3. Materialize the PNG into an object URL we can revoke later
      const blob = await diffRes.blob();
      if (controller.signal.aborted) return;

      const objectUrl = URL.createObjectURL(blob);
      setDiffUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setHasRunOnce(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to compute diff');
    } finally {
      setIsComputing(false);
    }
  }, [targetImageUrl]);

  // Auto-run on code change (debounced). setPreviewCode is called by
  // Battle.tsx on every code change; we just poll the latest snapshot.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runDiff();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runDiff]);

  // Revoke any object URL on unmount
  useEffect(() => {
    return () => {
      if (diffUrl) URL.revokeObjectURL(diffUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 z-10">
      {error && !isComputing && (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-sm text-destructive text-center max-w-sm">{error}</p>
        </div>
      )}

      {isComputing && !diffUrl && (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-sm">Scoring via rendering engine...</p>
          </div>
        </div>
      )}

      {isComputing && diffUrl && (
        <div className="w-full h-full relative">
          <img
            src={diffUrl}
            alt="Previous diff (updating)"
            className="w-full h-full object-contain opacity-60"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-foreground bg-surface-1 backdrop-blur-sm rounded-xl px-6 py-4 border border-border">
              <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              <p className="text-sm">Updating diff…</p>
            </div>
          </div>
        </div>
      )}

      {!isComputing && diffUrl && (
        <div className="w-full h-full bg-surface-1 flex items-center justify-center">
          <img
            src={diffUrl}
            alt="Difference overlay — mismatched pixels highlighted"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {diffUrl && score !== null && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-surface-2 backdrop-blur-sm text-xs font-medium rounded-lg border border-border font-mono">
          <span
            className={
              score >= 90
                ? 'text-success'
                : score >= 75
                  ? 'text-accent'
                  : score >= 50
                    ? 'text-warning'
                    : 'text-destructive'
            }
          >
            {score.toFixed(2)}% match
          </span>
        </div>
      )}

      {hasRunOnce && !isComputing && (
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={runDiff}
            className="px-3 py-1.5 bg-surface-3 hover:bg-surface-4 text-xs text-foreground rounded-lg transition-colors backdrop-blur-sm border border-border"
          >
            Re-run
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CompareView — wraps the preview with the selected compare mode overlay
// ---------------------------------------------------------------------------
export function CompareView({
  mode,
  targetImageUrl,
  children,
}: {
  mode: CompareMode;
  targetImageUrl: string;
  children: React.ReactNode;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-full h-full">{children}</div>

      {mode === 'split' && (
        <SplitSlider
          targetImageUrl={targetImageUrl}
          isHovering={isHovering}
        />
      )}
      {mode === 'opacity' && (
        <OpacitySlider
          targetImageUrl={targetImageUrl}
          isHovering={isHovering}
        />
      )}
      {mode === 'diff' && (
        <DiffMode
          key={targetImageUrl}
          targetImageUrl={targetImageUrl}
        />
      )}
    </div>
  );
}
