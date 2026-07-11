import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '../../lib/api.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  Eye,
  Search,
  FileText,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  Flag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminSubmission {
  id: string;
  userId: string;
  codeLength: number;
  score: number | null;
  screenshotUrl: string | null;
  isBest: boolean;
  submittedAt: string;
  reviewStatus: string;
  overrideScore: number | null;
  flaggedForReview: boolean;
  reviewedAt?: string;
  user: { name: string; rollNumber: string | null };
  challenge: { id: string; title: string; roundNumber: number };
}

interface Challenge {
  id: string;
  title: string;
  roundNumber: number;
}

type SortField = 'submittedAt' | 'score' | 'codeLength';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: 'text-slate-300', bg: 'bg-slate-500/10', label: 'Pending', icon: Clock },
  APPROVED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Approved', icon: CheckCircle2 },
  REJECTED: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Rejected', icon: XCircle },
  FLAGGED: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Flagged', icon: Flag },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

function ScoreDisplay({ score, overrideScore }: { score: number | null; overrideScore: number | null }) {
  const displayScore = overrideScore !== null ? overrideScore : score;
  if (displayScore === null) return <span className="text-slate-600">—</span>;

  const colorClass =
    displayScore >= 90
      ? 'text-emerald-400'
      : displayScore >= 75
        ? 'text-blue-400'
        : displayScore >= 50
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="flex items-center gap-1">
      <span className={`font-mono text-sm font-bold ${colorClass}`}>
        {displayScore.toFixed(1)}
      </span>
      {overrideScore !== null && (
        <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1 rounded">
          ovr
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-800/50 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <FileText className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium text-slate-400">
        {hasFilters ? 'No submissions match your filters' : 'No submissions yet'}
      </p>
      <p className="text-xs mt-1">
        {hasFilters
          ? 'Try adjusting your search or filter criteria'
          : 'Submissions will appear here once participants start submitting'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable header
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminSubmissionTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Fetch challenges for filter
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['admin-all-challenges'],
    queryFn: () => apiGet('/api/admin/challenges'),
  });

  // Fetch all submissions
  const {
    data: submissions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<AdminSubmission[]>({
    queryKey: ['admin-submissions-all', selectedChallengeId],
    queryFn: async () => {
      const url = selectedChallengeId
        ? `/api/admin/submissions?challengeId=${selectedChallengeId}`
        : '/api/admin/submissions';
      return apiGet(url);
    },
  });

  // Reset page when filters change
  const hasFilters = searchQuery || selectedChallengeId || statusFilter !== 'ALL';

  // Apply filters, search, and sort
  const processed = useMemo(() => {
    let result = [...submissions];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.user.name.toLowerCase().includes(q) ||
          s.user.rollNumber?.toLowerCase().includes(q) ||
          s.challenge.title.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.reviewStatus === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'submittedAt') {
        cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else if (sortField === 'score') {
        const aScore = a.overrideScore ?? a.score ?? -1;
        const bScore = b.overrideScore ?? b.score ?? -1;
        cmp = aScore - bScore;
      } else if (sortField === 'codeLength') {
        cmp = a.codeLength - b.codeLength;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [submissions, searchQuery, statusFilter, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = processed.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedChallengeId(null);
    setStatusFilter('ALL');
    setPage(0);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Submissions</h1>
        <p className="text-slate-400 mt-1 text-sm">Review, filter, and manage all participant submissions</p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search by name, challenge, or ID..."
              className="w-full bg-slate-950/50 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-600"
            />
          </div>

          {/* Challenge filter */}
          <select
            value={selectedChallengeId ?? ''}
            onChange={(e) => { setSelectedChallengeId(e.target.value || null); setPage(0); }}
            className="appearance-none bg-slate-950/50 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
          >
            <option value="">All Challenges</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                Round {c.roundNumber} — {c.title}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as FilterStatus); setPage(0); }}
              className="appearance-none bg-slate-950/50 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FLAGGED">Flagged</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Count badge */}
          <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg whitespace-nowrap">
            {processed.length} result{processed.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <table className="w-full">
            <tbody>
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center justify-center py-16 text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">Failed to load submissions.</span>
            <button onClick={() => refetch()} className="ml-3 text-sm text-slate-400 hover:text-white underline">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && processed.length === 0 && (
          <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
        )}

        {/* Table */}
        {!isLoading && !isError && processed.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-6 py-3.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">ID</span>
                  </th>
                  <th className="px-4 py-3.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Participant</span>
                  </th>
                  <th className="px-4 py-3.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Challenge</span>
                  </th>
                  <th className="px-4 py-3.5">
                    <SortHeader label="Score" field="score" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3.5">
                    <SortHeader label="Submitted" field="submittedAt" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</span>
                  </th>
                  <th className="px-6 py-3.5 text-right">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Review</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                <AnimatePresence mode="popLayout">
                  {paginated.map((sub) => (
                    <motion.tr
                      key={sub.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <code className="text-xs font-mono text-slate-500">{sub.id.slice(0, 8)}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{sub.user.name}</span>
                          {sub.user.rollNumber && (
                            <span className="text-xs text-slate-500">{sub.user.rollNumber}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-slate-400">
                          R{sub.challenge.roundNumber} · {sub.challenge.title}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ScoreDisplay score={sub.score} overrideScore={sub.overrideScore} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(sub.submittedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={sub.reviewStatus} />
                          {sub.flaggedForReview && (
                            <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
                              flagged
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to={`/admin/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(safePage * PAGE_SIZE) + 1}–{Math.min((safePage + 1) * PAGE_SIZE, processed.length)} of {processed.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = Math.max(0, Math.min(safePage - 3, totalPages - 7)) + i;
                  if (pageNum >= totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        pageNum === safePage
                          ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                          : 'text-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
