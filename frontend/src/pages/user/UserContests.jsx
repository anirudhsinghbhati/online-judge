import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { formatContestDateTime } from '../../constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload.data;
}

export default function UserContests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadContests() {
      try {
        setLoading(true);
        setError('');
        const userId = localStorage.getItem('demo_active_user_id') || 0;
        const data = await requestJson(`/api/contests?userId=${userId}`);
        if (!cancelled) {
          setContests(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadContests();

    return () => {
      cancelled = true;
    };
  }, []);

  // Partition contests
  const activeContests = contests.filter((c) => c.status === 'Active');
  const upcomingContests = contests.filter((c) => c.status === 'Upcoming');
  const completedContests = contests.filter((c) => c.status === 'Completed');

  function renderContestCard(contest) {
    let statusBadgeColor = 'border-slate-500/20 bg-slate-500/10 text-slate-400';
    let borderAccent = 'hover:border-white/20';

    if (contest.status === 'Active') {
      statusBadgeColor = 'border-emerald-400/20 bg-emerald-400/15 text-emerald-300 animate-pulse';
      borderAccent = 'hover:border-emerald-400/30';
    } else if (contest.status === 'Upcoming') {
      statusBadgeColor = 'border-amber-400/20 bg-amber-400/15 text-amber-300';
      borderAccent = 'hover:border-amber-400/30';
    }

    return (
      <div
        key={contest.id}
        className={`group relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/45 p-6 transition duration-200 ${borderAccent}`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeColor}`}>
                {contest.status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                {contest.status}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Code: {contest.contest_code}</span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
              {contest.contest_name}
            </h3>
            {contest.description && (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-xl">
                {contest.description}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right sm:text-left font-mono text-xs text-slate-400 space-y-1 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-slate-600 uppercase text-[9px] tracking-wider block font-sans">Start</span>
              {formatContestDateTime(contest.start_date, contest.start_time)}
            </div>
            <div className="pt-1">
              <span className="text-slate-600 uppercase text-[9px] tracking-wider block font-sans">End</span>
              {formatContestDateTime(contest.end_date, contest.end_time)}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center border-t border-white/5 pt-4 gap-4 mt-6">
          <span className="text-xs text-slate-500">
            Duration: <span className="text-slate-300 font-semibold">{contest.duration}</span> | Visibility: <span className="text-slate-300 font-semibold">{contest.visibility}</span>
          </span>

          <Link
            to={`/user/contests/${contest.id}`}
            className="w-full sm:w-auto text-center inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-400 hover:text-slate-950 hover:border-transparent transition duration-200"
          >
            {contest.status === 'Upcoming' ? 'View Details' : contest.status === 'Active' ? 'Enter Contest' : 'Leaderboard'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-8 flex-1 flex flex-col">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">Coding Contests</h1>
          <p className="text-sm text-slate-400 mt-1">Compete live, check upcoming schedules, and review past leaderboards.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-[24px] bg-white/5" />
            <div className="h-44 animate-pulse rounded-[24px] bg-white/5" />
          </div>
        ) : contests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-slate-400 text-sm">
            No contests scheduled at this time.
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* ACTIVE CONTESTS SECTION */}
            {activeContests.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-sm uppercase font-bold tracking-[0.2em] text-emerald-300">Active Events</h2>
                </div>
                <div className="grid gap-4">
                  {activeContests.map(renderContestCard)}
                </div>
              </section>
            )}

            {/* UPCOMING CONTESTS SECTION */}
            {upcomingContests.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <h2 className="text-sm uppercase font-bold tracking-[0.2em] text-amber-300">Upcoming Events</h2>
                </div>
                <div className="grid gap-4">
                  {upcomingContests.map(renderContestCard)}
                </div>
              </section>
            )}

            {/* COMPLETED CONTESTS SECTION */}
            {completedContests.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  <h2 className="text-sm uppercase font-bold tracking-[0.2em] text-slate-400">Completed Events</h2>
                </div>
                <div className="grid gap-4">
                  {completedContests.map(renderContestCard)}
                </div>
              </section>
            )}

          </div>
        )}

      </div>
    </UserLayout>
  );
}
