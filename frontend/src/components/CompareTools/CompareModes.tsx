import { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal, Eye, Columns2, ScanLine } from 'lucide-react';

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
    <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => onModeChange(m.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === m.key
              ? 'bg-amber-500/20 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
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

  // Track mouse position on hover — updates split position automatically
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
      {/* Target image — visible as the overlay, clipped from the right */}
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

      {/* Split line — follows cursor position */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-lg shadow-amber-500/50 z-20 pointer-events-none"
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
      {/* Target image overlaid with opacity — keep pointer-events so slider works */}
      <div className="pointer-events-none w-full h-full">
        <img
          src={targetImageUrl}
          alt="Target"
          className="w-full h-full object-contain"
          style={{ opacity: opacity / 100 }}
          draggable={false}
        />
      </div>
      {/* Slider at the bottom */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50 min-w-[200px]">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-slate-400 font-mono w-8 text-right shrink-0">
          {opacity}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Difference Mode — html2canvas + pixelmatch
// ---------------------------------------------------------------------------
function DiffMode({
  targetImageUrl,
  iframeRef,
}: {
  targetImageUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [diffCanvas, setDiffCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiff = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsComputing(true);
    setError(null);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const pixelmatch = (await import('pixelmatch')).default;

      // Access the iframe's content document directly — html2canvas struggles
      // when passed an iframe element, but works reliably when given the inner document body.
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc?.body) {
        throw new Error('Cannot access iframe content — check sandbox permissions');
      }

      // Let the browser finish layout/paint before capturing
      await new Promise((r) => setTimeout(r, 200));

      // Capture the iframe's content body (not the iframe element itself)
      const previewCanvas = await html2canvas(iframeDoc.body, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // Load the target image onto a canvas
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = previewCanvas.width;
      targetCanvas.height = previewCanvas.height;
      const targetCtx = targetCanvas.getContext('2d');
      if (!targetCtx) {
        throw new Error('Could not get 2D context');
      }

      const targetImg = new Image();
      targetImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        targetImg.onload = () => {
          // Draw target stretched to fill the entire canvas — matches server-side
          // scoring behavior (sharp.resize with fit: 'fill')
          targetCtx.drawImage(targetImg, 0, 0, previewCanvas.width, previewCanvas.height);
          resolve();
        };
        targetImg.onerror = () => reject(new Error('Failed to load target image'));
        targetImg.src = targetImageUrl;
      });

      // Run pixelmatch — exact pixel comparison matching server-side threshold
      const diffW = previewCanvas.width;
      const diffH = previewCanvas.height;
      const diffCanvas_ = document.createElement('canvas');
      diffCanvas_.width = diffW;
      diffCanvas_.height = diffH;
      const diffCtx = diffCanvas_.getContext('2d');
      if (!diffCtx) throw new Error('Could not get diff canvas context');

      const diffData = diffCtx.createImageData(diffW, diffH);
      const previewData = previewCanvas
        .getContext('2d')!
        .getImageData(0, 0, diffW, diffH);
      const targetData = targetCtx.getImageData(0, 0, diffW, diffH);

      pixelmatch(
        previewData.data,
        targetData.data,
        diffData.data,
        diffW,
        diffH,
        { threshold: 0, alpha: 0.5 }
      );

      diffCtx.putImageData(diffData, 0, 0);
      setDiffCanvas(diffCanvas_);
    } catch (err: any) {
      setError(err.message || 'Failed to compute diff');
    } finally {
      setIsComputing(false);
    }
  }, [targetImageUrl, iframeRef]);

  return (
    <div className="absolute inset-0 z-10">
      {!diffCanvas && !isComputing && (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={runDiff}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-amber-500/20"
          >
            <ScanLine className="w-4 h-4" />
            Run Diff
          </button>
        </div>
      )}

      {isComputing && (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-sm">Computing difference...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {diffCanvas && (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={diffCanvas.toDataURL()}
            alt="Difference overlay"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {diffCanvas && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          <button
            onClick={runDiff}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors backdrop-blur-sm"
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
  iframeRef,
  children,
}: {
  mode: CompareMode;
  targetImageUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  children: React.ReactNode;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* The preview (base layer) */}
      <div className="w-full h-full">
        {children}
      </div>

      {/* Compare mode overlays — visible only on hover except Diff */}
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
          iframeRef={iframeRef}
        />
      )}
    </div>
  );
}
