import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Circle,
  ImageIcon,
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  targetImageUrl: string;
  roundNumber: number;
}

const difficultyConfig = {
  EASY: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Easy' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
  HARD: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Hard' },
};

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: challenge, isLoading, isError } = useQuery<Challenge>({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${id}`);
      if (!res.ok) throw new Error('Failed to fetch challenge');
      return res.json();
    },
    enabled: !!id,
  });

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
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/challenges')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to challenges
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-lg">
            Round {challenge.roundNumber}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <Circle className="w-1.5 h-1.5 fill-current" />
            {cfg.label}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mt-3 mb-3">{challenge.title}</h1>

        {challenge.description && (
          <p className="text-slate-400 text-lg mb-8">{challenge.description}</p>
        )}

        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            Target Image
          </h2>
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex items-center justify-center min-h-[300px]">
            <img
              src={challenge.targetImageUrl}
              alt={`Target for ${challenge.title}`}
              className="max-w-full max-h-[500px] rounded-lg shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = `
                  <div class="flex flex-col items-center gap-3 text-slate-600 py-12">
                    <svg class="w-12 h-12 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    <p class="text-sm">Target image not yet available</p>
                  </div>
                `;
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
