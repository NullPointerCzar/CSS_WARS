import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdminPin, setAdminPin } from '../../lib/config.js';
import {
  Plus,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Image as ImageIcon,
  X,
  Circle,
  Swords,
  Upload,
  ShieldCheck,
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  targetImageUrl: string;
  roundNumber: number;
  published: boolean;
  createdAt: string;
}

const difficultyConfig = {
  EASY: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Easy' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
  HARD: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Hard' },
};

function ChallengeForm({
  challenge,
  onClose,
}: {
  challenge?: Challenge | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(challenge?.title ?? '');
  const [description, setDescription] = useState(challenge?.description ?? '');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>(challenge?.difficulty ?? 'EASY');
  const [roundNumber, setRoundNumber] = useState(challenge?.roundNumber ?? 1);
  const [targetImageUrl, setTargetImageUrl] = useState(challenge?.targetImageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; difficulty: string; roundNumber: number; targetImageUrl: string }) => {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create challenge');
      }
      return res.json();
    },
    onSuccess: async (createdChallenge) => {
      // If there's an image file, upload it after creation
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const imgRes = await fetch(`/api/admin/challenges/${createdChallenge.id}/image`, {
          method: 'POST',
          headers: { 'x-admin-pin': getAdminPin()! },
          body: formData,
        });
        if (!imgRes.ok) {
          console.error('Image upload failed, but challenge was created');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { title?: string; description?: string; difficulty?: string; roundNumber?: number; targetImageUrl?: string }) => {
      const res = await fetch(`/api/admin/challenges/${challenge!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update challenge');
      }
      return res.json();
    },
    onSuccess: async () => {
      if (imageFile && challenge) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const imgRes = await fetch(`/api/admin/challenges/${challenge.id}/image`, {
          method: 'POST',
          headers: { 'x-admin-pin': getAdminPin()! },
          body: formData,
        });
        if (!imgRes.ok) {
          console.error('Image upload failed');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      title,
      description,
      difficulty,
      roundNumber,
      targetImageUrl,
    };

    if (challenge) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    setImageFile(null);
    setError(null);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {challenge ? 'Edit Challenge' : 'Create Challenge'}
          </h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              placeholder="e.g. Simple Square"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
              placeholder="Describe what participants need to build..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Round</label>
              <input
                type="number"
                min={1}
                value={roundNumber}
                onChange={(e) => setRoundNumber(Number(e.target.value))}
                required
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          {!challenge && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Target Image URL</label>
              <input
                type="text"
                value={targetImageUrl}
                onChange={(e) => setTargetImageUrl(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                placeholder="/targets/challenge-1.png"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Upload Target Image</label>
            <label className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 border border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors">
              <Upload className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-400">
                {imageFile ? imageFile.name : 'Choose an image file...'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <p className="text-xs text-slate-600 mt-1">Accepted: PNG, JPG, GIF, WebP, SVG (max 5MB)</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : challenge ? (
                'Save Changes'
              ) : (
                'Create Challenge'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Confirm Dialog (inline, matching AdminDashboard pattern)
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

function AdminPinGate({ onPinSet }: { onPinSet: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
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
          Enter the shared admin PIN to manage challenges.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter admin PIN"
            className="w-full text-center text-2xl tracking-[0.5em] bg-slate-950/50 border border-slate-800 text-white rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
            autoFocus
            required
          />

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isChecking || pin.length < 1}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Unlock Challenge Manager'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function ChallengeManage() {
  const [pinVerified, setPinVerified] = useState(!!getAdminPin());

  if (!pinVerified) {
    return <AdminPinGate onPinSet={() => setPinVerified(true)} />;
  }

  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: challenges = [], isLoading, isError } = useQuery<Challenge[]>({
    queryKey: ['admin-all-challenges'],
    queryFn: async () => {
      const res = await fetch('/api/admin/challenges', {
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const res = await fetch(`/api/admin/challenges/${challengeId}/publish`, {
        method: 'PATCH',
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to toggle publish state');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const res = await fetch(`/api/admin/challenges/${challengeId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete challenge');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
        <p>Loading challenges...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400">Failed to load challenges.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Challenge Management</h1>
            <p className="text-slate-400 mt-1">Create, edit, publish, and manage CSS challenges</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          New Challenge
        </button>
      </div>

      <AnimatePresence>
        {deleteError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 border border-red-500/20 text-sm"
          >
            {deleteError}
          </motion.div>
        )}
      </AnimatePresence>

      {challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Swords className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No challenges yet</p>
          <p className="text-sm mt-1">Create your first challenge to get started.</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Challenge</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-4">Round</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-4">Difficulty</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-4">Status</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {challenges.map((challenge) => {
                const cfg = difficultyConfig[challenge.difficulty];
                return (
                  <motion.tr
                    key={challenge.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {challenge.targetImageUrl ? (
                            <img
                              src={challenge.targetImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '';
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{challenge.title}</p>
                          {challenge.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{challenge.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">{challenge.roundNumber}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        challenge.published ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {challenge.published ? (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            Published
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Unpublished
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingChallenge(challenge);
                            setShowForm(true);
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => publishMutation.mutate(challenge.id)}
                          disabled={publishMutation.isPending}
                          className={`p-2 rounded-lg transition-colors ${
                            challenge.published
                              ? 'text-slate-500 hover:text-amber-400 hover:bg-slate-700'
                              : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-700'
                          }`}
                          title={challenge.published ? 'Unpublish' : 'Publish'}
                        >
                          {publishMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : challenge.published ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(challenge.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete Challenge"
        message="Are you sure you want to delete this challenge? This cannot be undone if it has submissions."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) {
            deleteMutation.mutate(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <AnimatePresence>
        {showForm && (
          <ChallengeForm
            challenge={editingChallenge}
            onClose={() => {
              setShowForm(false);
              setEditingChallenge(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
