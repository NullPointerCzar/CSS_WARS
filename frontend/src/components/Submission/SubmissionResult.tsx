import { motion } from 'framer-motion';
import { Trophy, AlertCircle, Loader2, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionResultData {
  id: string;
  score: number | null;
  screenshotUrl: string | null;
  codeLength: number;
  isBest: boolean;
  rank: number | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Score display helper
// ---------------------------------------------------------------------------

function ScoreCircle({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-500">—</span>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 38; // r=38
  const offset = circumference - (clamped / 100) * circumference;

  // Color based on score tier
  const color =
    clamped >= 90
      ? 'text-emerald-400 stroke-emerald-400'
      : clamped >= 75
        ? 'text-blue-400 stroke-blue-400'
        : clamped >= 50
          ? 'text-amber-400 stroke-amber-400'
          : 'text-red-400 stroke-red-400';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle
          cx="44"
          cy="44"
          r="38"
          fill="none"
          strokeWidth="5"
          className="stroke-slate-700"
        />
        <motion.circle
          cx="44"
          cy="44"
          r="38"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span className={`text-2xl font-bold ${color.replace('stroke-', 'text-')}`}>
          {clamped.toFixed(1)}
        </span>
        <span className="text-[10px] text-slate-500 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SubmissionResult component
// ---------------------------------------------------------------------------

export function SubmissionResult({
  result,
  targetImageUrl,
  onClose,
}: {
  result: SubmissionResultData;
  targetImageUrl: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Submission Result</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {result.error && !result.score ? (
        /* Error state — rendering failed */
        <div className="flex flex-col items-center gap-3 py-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-red-400 text-sm text-center">{result.error}</p>
          <p className="text-xs text-slate-500">Try adjusting your code and submitting again.</p>
        </div>
      ) : (
        /* Success state — show score + side-by-side screenshots */
        <div className="space-y-5">
          {/* Score + Rank row */}
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-1">
              <ScoreCircle score={result.score} />
              <span className="text-xs text-slate-500 font-medium">Similarity</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold text-white">
                {result.rank !== null ? `#${result.rank}` : '—'}
              </div>
              <span className="text-xs text-slate-500 font-medium">Rank</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold text-slate-300">
                {result.codeLength.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 font-medium">Bytes</span>
            </div>
          </div>

          {/* Side-by-side screenshots */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Your Result vs. Target
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Screenshot of submission */}
              <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950">
                <div className="bg-slate-800/50 px-3 py-1.5 border-b border-slate-700/50">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Your Code
                  </span>
                </div>
                <div className="aspect-[4/3] bg-white flex items-center justify-center">
                  {result.screenshotUrl ? (
                    <img
                      src={result.screenshotUrl}
                      alt="Your submission screenshot"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">No screenshot</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Target image */}
              <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950">
                <div className="bg-slate-800/50 px-3 py-1.5 border-b border-slate-700/50">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Target
                  </span>
                </div>
                <div className="aspect-[4/3] bg-white flex items-center justify-center">
                  <img
                    src={targetImageUrl}
                    alt="Target image"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {result.isBest && result.score !== null && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                New personal best!
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
