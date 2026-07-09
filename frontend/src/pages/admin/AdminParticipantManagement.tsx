import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdminPin } from '../../lib/config.js';
import {
  Users,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  KeyRound,
  Pencil,
  X,
  Check,
  UserPlus,
  Upload,
  ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  name: string;
  role: string;
  hasPin: boolean;
}

// ---------------------------------------------------------------------------
// Single Add Form
// ---------------------------------------------------------------------------

function SingleAddForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ participants: [{ name: newName.trim() }] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add participant');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      setName('');
      setError(null);
      inputRef.current?.focus();
      onAdded();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    addMutation.mutate(name);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter participant name..."
        className="flex-1 bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
      />
      <button
        type="submit"
        disabled={addMutation.isPending || !name.trim()}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors whitespace-nowrap"
      >
        {addMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        Add
      </button>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Bulk Add Form
// ---------------------------------------------------------------------------

function BulkAddForm({ onAdded }: { onAdded: () => void }) {
  const queryClient = useQueryClient();
  const [namesText, setNamesText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const addMutation = useMutation({
    mutationFn: async (names: string[]) => {
      const participants = names.map((n) => ({ name: n.trim() }));
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ participants }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add participants');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      setNamesText('');
      setError(null);
      setIsOpen(false);
      onAdded();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const names = namesText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;
    setError(null);
    addMutation.mutate(names);
  };

  const nameCount = namesText
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0).length;

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
      >
        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          Bulk add names
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-4 space-y-3 border-t border-slate-700/50">
              <textarea
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder={`Paste names here, one per line:\n\nAlice\nBob\nCharlie`}
                rows={6}
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600 resize-none font-mono"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {nameCount > 0 ? `${nameCount} name${nameCount !== 1 ? 's' : ''} detected` : 'Enter names above'}
                </span>
                <button
                  type="submit"
                  disabled={addMutation.isPending || nameCount === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add {nameCount > 0 ? `${nameCount}` : ''}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Participant Row
// ---------------------------------------------------------------------------

function ParticipantRow({
  participant,
  onUpdated,
}: {
  participant: Participant;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(participant.name);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update name');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      setIsEditing(false);
      setError(null);
      onUpdated();
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': getAdminPin()! },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      setConfirmDelete(false);
      onUpdated();
    },
    onError: (err: Error) => setError(err.message),
  });

  const pinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await fetch(`/api/admin/participants/${participant.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': getAdminPin()! },
        body: JSON.stringify({ pinCode: pin }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to set PIN');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      setShowPinInput(false);
      setPinValue('');
      setError(null);
      onUpdated();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 transition-colors group border border-slate-800/30"
    >
      {/* Edit or Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-slate-950/70 border border-slate-700 text-white rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim()) editMutation.mutate(editName);
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <button
              onClick={() => editMutation.mutate(editName)}
              disabled={editMutation.isPending || !editName.trim()}
              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditName(participant.name);
              }}
              className="p-1 rounded text-slate-500 hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{participant.name}</span>
            {participant.hasPin && (
              <span className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">PIN</span>
            )}
            {participant.role === 'ADMIN' && (
              <span className="text-[10px] font-medium text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-md">ADMIN</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {participant.role !== 'ADMIN' && (
          <>
            <button
              onClick={() => {
                setShowPinInput(!showPinInput);
                setPinValue('');
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title={participant.hasPin ? 'Change PIN' : 'Set PIN'}
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="Edit name"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Inline PIN input */}
      <AnimatePresence>
        {showPinInput && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <input
              type="text"
              maxLength={4}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN"
              className="w-20 bg-slate-950/70 border border-slate-700 text-white rounded-lg py-1 px-2 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pinValue.length >= 4) pinMutation.mutate(pinValue);
                if (e.key === 'Escape') setShowPinInput(false);
              }}
            />
            <button
              onClick={() => pinMutation.mutate(pinValue)}
              disabled={pinMutation.isPending || (pinValue.length > 0 && pinValue.length < 4)}
              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-30"
            >
              {pinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmDelete(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Participant</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Remove <strong>{participant.name}</strong> from the participant list?
                    {participant.hasPin && (
                      <span className="block mt-1 text-amber-400">This participant has a PIN set.</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-colors flex items-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast for this row */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 top-full mt-1 bg-red-500/10 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 whitespace-nowrap"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminParticipantManagement() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: participants = [], isLoading, isError } = useQuery<Participant[]>({
    queryKey: ['participants', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/participants');
      if (!res.ok) throw new Error('Failed to fetch participants');
      return res.json();
    },
    staleTime: 5_000,
  });

  const nonAdminParticipants = participants.filter((p) => p.role !== 'ADMIN');
  const adminAccounts = participants.filter((p) => p.role === 'ADMIN');

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">Participants</h2>
          <p className="text-xs text-slate-500">
            {isLoading
              ? 'Loading...'
              : `${nonAdminParticipants.length} participant${nonAdminParticipants.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
      </div>

      {/* Add forms */}
      <div className="space-y-3 mb-5">
        <SingleAddForm onAdded={handleRefresh} />
        <BulkAddForm onAdded={handleRefresh} />
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center justify-center py-8 text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">Failed to load participants</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {/* Participant list */}
      {!isLoading && !isError && nonAdminParticipants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Users className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No participants yet</p>
          <p className="text-xs mt-1">Add participants above so they can join the competition.</p>
        </div>
      )}

      {!isLoading && !isError && nonAdminParticipants.length > 0 && (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {nonAdminParticipants.map((p) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              onUpdated={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Admin accounts note */}
      {adminAccounts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <p className="text-xs text-slate-600">
            Admin accounts ({adminAccounts.map((a) => a.name).join(', ')}) — not shown in the participant list.
          </p>
        </div>
      )}
    </div>
  );
}
