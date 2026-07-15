import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../../lib/api.js';
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
  EASY: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', label: 'Easy' },
  MEDIUM: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Medium' },
  HARD: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', label: 'Hard' },
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; difficulty: string; roundNumber: number }) => {
      return apiPost('/api/admin/challenges', data);
    },
    onSuccess: async (createdChallenge: any) => {
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        try {
          await apiUpload(`/api/admin/challenges/${createdChallenge.id}/image`, formData);
        } catch (e) {
          console.error('Image upload failed, but challenge was created');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { title?: string; description?: string; difficulty?: string; roundNumber?: number }) => {
      return apiPut(`/api/admin/challenges/${challenge!.id}`, data);
    },
    onSuccess: async () => {
      if (imageFile && challenge) {
        const formData = new FormData();
        formData.append('image', imageFile);
        try {
          await apiUpload(`/api/admin/challenges/${challenge.id}/image`, formData);
        } catch (e) {
          console.error('Image upload failed');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      title,
      description,
      difficulty,
      roundNumber,
    };

    if (challenge) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-surface-1/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface-2 border border-border rounded-2xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {challenge ? 'Edit Challenge' : 'Create Challenge'}
          </h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface-1 border border-border text-foreground rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-warning transition-all"
              placeholder="e.g. Simple Square"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface-1 border border-border text-foreground rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-warning transition-all resize-none"
              placeholder="Describe what participants need to build..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                className="w-full bg-surface-1 border border-border text-foreground rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-warning transition-all"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Round</label>
              <input
                type="number"
                min={1}
                value={roundNumber}
                onChange={(e) => setRoundNumber(Number(e.target.value))}
                required
                className="w-full bg-surface-1 border border-border text-foreground rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-warning transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Target Image</label>
            <label className="flex items-center gap-3 px-4 py-3 bg-surface-1 border border-dashed border-border rounded-xl cursor-pointer hover:border-warning/50 transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {imageFile ? imageFile.name : 'Choose an image file...'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setImagePreview(null);
                  }
                }}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">Accepted: PNG, JPG, GIF, WebP, SVG (max 5MB)</p>
            {imagePreview && (
              <div className="mt-3 inline-block">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <img src={imagePreview} alt="Preview" className="h-24 rounded-lg border border-border object-contain bg-surface-1" />
              </div>
            )}
            {challenge?.targetImageUrl && !imageFile && (
              <div className="mt-3 inline-block">
                <p className="text-xs text-muted-foreground mb-1">Current image:</p>
                <img src={challenge.targetImageUrl} alt="Current" className="h-24 rounded-lg border border-border object-contain bg-surface-1" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm border border-destructive/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] bg-warning hover:bg-warning disabled:opacity-50 disabled:cursor-not-allowed text-foreground py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
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
            className={`px-4 py-2 rounded-xl text-sm font-medium text-foreground transition-colors ${
              variant === 'danger'
                ? 'bg-destructive hover:bg-destructive'
                : 'bg-warning hover:bg-warning'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ChallengeManage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: challenges = [], isLoading, isError } = useQuery<Challenge[]>({
    queryKey: ['admin-all-challenges'],
    queryFn: async () => {
      return apiGet('/api/admin/challenges');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return apiPatch(`/api/admin/challenges/${challengeId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return apiDelete(`/api/admin/challenges/${challengeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-warning" />
        <p>Loading challenges...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive">Failed to load challenges.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Challenges</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create, edit, publish, and manage CSS challenges</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-warning hover:bg-warning text-foreground px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-warning/20"
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
            className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6 border border-destructive/20 text-sm"
          >
            {deleteError}
          </motion.div>
        )}
      </AnimatePresence>

      {challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Swords className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No challenges yet</p>
          <p className="text-sm mt-1">Create your first challenge to get started.</p>
        </div>
      ) : (
        <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Challenge</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">Round</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">Difficulty</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {challenges.map((challenge) => {
                const cfg = difficultyConfig[challenge.difficulty];
                return (
                  <motion.tr
                    key={challenge.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group hover:bg-surface-3 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center overflow-hidden shrink-0">
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
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{challenge.title}</p>
                          {challenge.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{challenge.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{challenge.roundNumber}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        challenge.published ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {challenge.published ? (
                          <><Globe className="w-3.5 h-3.5" /> Published</>
                        ) : (
                          <><Lock className="w-3.5 h-3.5" /> Unpublished</>
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
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-4 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => publishMutation.mutate(challenge.id)}
                          disabled={publishMutation.isPending}
                          className={`p-2 rounded-lg transition-colors ${
                            challenge.published
                              ? 'text-muted-foreground hover:text-warning hover:bg-surface-4'
                              : 'text-muted-foreground hover:text-success hover:bg-surface-4'
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
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
