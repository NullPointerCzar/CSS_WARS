import { useState, useCallback, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const submitIdentity = useCallback(
    async (pinToSend: string | undefined) => {
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
        if (data.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/challenges');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedUser]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitIdentity(selectedUser?.hasPin ? pinCode : undefined);
  };

  const submitDirect = useCallback(() => {
    submitIdentity(undefined);
  }, [submitIdentity]);

  const handleBack = () => {
    setSelectedUser(null);
    setPinCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle brand glow — restrained, not a full gradient wash */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-brand/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-lg shadow-soft-lg p-7 relative z-10"
      >
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-brand text-brand-foreground rounded-xl mx-auto flex items-center justify-center mb-4 shadow-soft-md ring-1 ring-brand/30">
            <UserIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">CSS WARS</h1>
          <p className="text-muted-foreground mt-1 text-sm">Select your name to continue</p>
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
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand" />
                  <p>Loading participants…</p>
                </div>
              ) : isError ? (
                <div className="bg-destructive-soft text-destructive p-4 rounded-md text-center border border-destructive/20">
                  Failed to load participants. Please try again.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search your name…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-surface-3 border border-border text-foreground rounded-md py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand transition-all placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {filteredParticipants.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No participants found.</p>
                    ) : (
                      filteredParticipants.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedUser(p);
                            if (!p.hasPin) {
                              setTimeout(() => submitDirect(), 0);
                            }
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-md bg-surface-3 hover:bg-surface-4 border border-border hover:border-brand/40 transition-all group text-left"
                        >
                          <span className="text-foreground font-medium">{p.name}</span>
                          <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-brand -rotate-90 transition-colors" />
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
                  <p className="text-muted-foreground mb-1 text-sm">Continuing as</p>
                  <p className="text-xl font-semibold text-foreground">{selectedUser.name}</p>
                </div>

                {selectedUser.hasPin && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-muted-foreground text-center">
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
                      className="w-full text-center text-3xl tracking-[1em] bg-surface-3 border border-border text-foreground rounded-md py-4 focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand transition-all font-mono"
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
                      className="bg-destructive-soft text-destructive p-3 rounded-md text-sm text-center border border-destructive/20"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-3 px-4 rounded-md text-muted-foreground hover:text-foreground border border-border hover:bg-surface-3 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (selectedUser.hasPin && pinCode.length !== 4)}
                    className="flex-[2] bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground py-3 px-4 rounded-md font-medium flex items-center justify-center gap-2 transition-colors shadow-soft-md"
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
