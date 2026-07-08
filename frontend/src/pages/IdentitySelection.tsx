import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, ArrowRight, Loader2, User as UserIcon } from 'lucide-react';
import { setIdentity } from '../lib/identity.js';

interface Participant {
  id: string;
  name: string;
  hasPin: boolean;
  role: 'PARTICIPANT' | 'ADMIN';
}

export function IdentitySelection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: participants = [], isLoading, isError } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: async () => {
      const res = await fetch('/api/participants');
      if (!res.ok) throw new Error('Failed to fetch participants');
      return res.json();
    },
  });

  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Submit identity selection — shared by both the form submit and the
   * auto-submit path (when no PIN is required).
   */
  const submitIdentity = useCallback(async (pinToSend: string | undefined) => {
    if (!selectedUser) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/identity/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          pinCode: pinToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      setIdentity({
        id: data.id,
        name: data.name,
        role: data.role,
      });
      // App.tsx will detect the identity change and redirect automatically
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitIdentity(selectedUser?.hasPin ? pinCode : undefined);
  };

  /**
   * Submit without a form event — used for auto-submit when a participant
   * with no PIN configured is selected.
   */
  const submitDirect = useCallback(() => {
    submitIdentity(undefined);
  }, [submitIdentity]);

  const handleBack = () => {
    setSelectedUser(null);
    setPinCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome to Yatra</h1>
          <p className="text-slate-400 mt-2">CSS Battle Platform</p>
        </div>

        <AnimatePresence mode="wait">
          {!selectedUser ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                  <p>Loading participants...</p>
                </div>
              ) : isError ? (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-center border border-red-500/20">
                  Failed to load participants. Please try again.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search your name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                    />
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {filteredParticipants.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No participants found.</p>
                    ) : (
                      filteredParticipants.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedUser(p);
                            if (!p.hasPin) {
                              // No PIN required — submit immediately
                              setTimeout(() => submitDirect(), 0);
                            }
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all group text-left"
                        >
                          <span className="text-slate-200 font-medium">{p.name}</span>
                          <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-blue-400 -rotate-90 transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="pin-entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center">
                  <p className="text-slate-400 mb-1">Continuing as</p>
                  <p className="text-xl font-semibold text-white">{selectedUser.name}</p>
                </div>

                {selectedUser.hasPin && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400 text-center">
                      Enter your 4-digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPinCode(val);
                      }}
                      className="w-full text-center text-3xl tracking-[1em] bg-slate-950/50 border border-slate-800 text-white rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      autoFocus
                      required
                    />
                  </div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm text-center border border-red-500/20"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-3 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (selectedUser.hasPin && pinCode.length !== 4)}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Continue <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
