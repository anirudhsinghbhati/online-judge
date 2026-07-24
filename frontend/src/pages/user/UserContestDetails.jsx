import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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

export default function UserContestDetails() {
  const { contestId } = useParams();
  const [searchParams] = useSearchParams();
  const ended = searchParams.get('ended') === 'true';
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadContest() {
      try {
        setLoading(true);
        setError('');
        const userId = localStorage.getItem('demo_active_user_id') || 0;
        const data = await requestJson(`/api/contests/${contestId}?userId=${userId}`);
        if (!cancelled) {
          setContest(data);
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

    loadContest();

    return () => {
      cancelled = true;
    };
  }, [contestId]);

  // Helper function to extract YYYY-MM-DD cleanly without timezone shifts
  function getYYYYMMDD(dateVal) {
    if (!dateVal) return '';
    const str = String(dateVal);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    if (str.includes('T')) {
      return str.split('T')[0];
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return str;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Compute countdown timer for upcoming or active contests
  useEffect(() => {
    if (!contest || (contest.status !== 'Upcoming' && contest.status !== 'Active')) {
      setTimeLeft('');
      return;
    }

    let timeoutId;
    let isRetrying = false;

    async function updateTimer() {
      const startStr = getYYYYMMDD(contest.start_date);
      const endStr = getYYYYMMDD(contest.end_date);
      const now = new Date();

      if (contest.status === 'Upcoming') {
        const startObj = new Date(`${startStr}T${contest.start_time}Z`);
        const diff = startObj - now;

        if (diff <= 0) {
          setTimeLeft('Starting soon...');
          if (!isRetrying) {
            isRetrying = true;
            timeoutId = setTimeout(async () => {
              try {
                const userId = localStorage.getItem('demo_active_user_id') || 0;
                const data = await requestJson(`/api/contests/${contestId}?userId=${userId}`);
                setContest(data);
                isRetrying = false;
              } catch (err) {
                console.error('Failed to auto-refresh contest details:', err);
                isRetrying = false;
              }
            }, 3000);
          }
          return;
        }

        const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        setTimeLeft(`${hrs}:${mins}:${secs}`);
      } else if (contest.status === 'Active') {
        const endObj = new Date(`${endStr}T${contest.end_time}Z`);
        const diff = endObj - now;

        if (diff <= 0) {
          setTimeLeft('Ended');
          setContest((curr) => curr ? { ...curr, status: 'Completed' } : null);
          return;
        }

        const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        setTimeLeft(`${hrs}:${mins}:${secs}`);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [contest, contestId]);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">Loading contest details...</p>
        </div>
      </UserLayout>
    );
  }

  if (error || !contest) {
    return (
      <UserLayout>
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 mt-6">
          {error || 'Contest not found'}
        </div>
        <div className="mt-4">
          <Link to="/user/contests" className="text-sm text-cyan-300 hover:underline">&larr; Back to Contests</Link>
        </div>
      </UserLayout>
    );
  }

  // RENDER LOCKED Countdown if UPCOMING
  if (contest.status === 'Upcoming') {
    return (
      <UserLayout>
        <div className="flex-1 flex flex-col items-center justify-center rounded-[32px] border border-white/10 bg-slate-950/80 p-8 text-center backdrop-blur-xl shadow-glow min-h-[500px]">
          <span className="text-6xl mb-6 animate-pulse select-none">🔒</span>
          <h2 className="text-3xl font-extrabold text-white uppercase tracking-wider">Contest is Locked</h2>
          
          <p className="mt-4 text-slate-300 max-w-md text-sm leading-relaxed">
            The contest <span className="font-semibold text-cyan-300">"{contest.contest_name}"</span> has not started yet.
          </p>

          <div className="mt-8 flex flex-col items-center">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono">Starts In</p>
            <div className="mt-3 bg-cyan-400/5 rounded-3xl px-8 py-5 border border-cyan-400/20 font-mono text-4xl font-extrabold text-cyan-300 tracking-wider shadow-inner">
              {timeLeft || 'Calculating...'}
            </div>
          </div>

          <div className="mt-8 bg-white/5 rounded-2xl px-6 py-4 border border-white/5 font-mono text-slate-400 text-xs space-y-1">
            <div>Schedule: {formatContestDateTime(contest.start_date, contest.start_time)}</div>
            <div>Duration: {contest.duration}</div>
          </div>

          <Link
            to="/user/contests"
            className="mt-8 rounded-full bg-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/20 transition"
          >
            &larr; Back to Listings
          </Link>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-6 flex-1 flex flex-col">
        
        {/* Time's Up / Ended Warning Banner */}
        {ended && (
          <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3.5 text-sm text-rose-200 flex items-center gap-2 animate-pulse">
            <span className="text-base select-none">⏰</span>
            <span>Time is up! The contest has ended. You have been redirected from the coding workspace.</span>
          </div>
        )}

        {/* Contest Header */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/45 p-6 shadow-glow backdrop-blur-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  contest.status === 'Active' 
                    ? 'border-emerald-400/20 bg-emerald-400/15 text-emerald-300 animate-pulse' 
                    : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                }`}>
                  {contest.status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                  {contest.status}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Code: {contest.contest_code}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-wide">{contest.contest_name}</h1>
              <p className="text-sm text-slate-300 max-w-3xl">{contest.description || 'No description provided.'}</p>
            </div>

            <div className="shrink-0 font-mono text-xs text-slate-400 bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
              {contest.status === 'Active' && timeLeft && (
                <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 animate-pulse mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>Time Left: {timeLeft}</span>
                </div>
              )}
              <div>Duration: <span className="text-white font-semibold">{contest.duration}</span></div>
              <div>Starts: {formatContestDateTime(contest.start_date, contest.start_time)}</div>
              <div>Ends: {formatContestDateTime(contest.end_date, contest.end_time)}</div>
            </div>
          </div>
        </div>

        {/* Contest Workspace Columns */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start flex-1">
          
          {/* PROBLEMS COLUMN */}
          <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-glow space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Contest Problems
            </h2>

            {contest.problems && contest.problems.length > 0 ? (
              <div className="grid gap-3">
                {contest.problems.map((problem, index) => (
                  <Link
                    key={problem.id}
                    to={`/user/problems/${problem.id}?contestId=${contestId}`}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/50 p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.04] group"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono font-bold">Problem #{index + 1}</span>
                      <h3 className="font-bold text-white group-hover:text-cyan-300 transition text-sm">
                        {problem.title}
                      </h3>
                    </div>

                    <span className="rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 group-hover:bg-cyan-400 group-hover:text-slate-950 group-hover:border-transparent transition">
                      Solve
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-400 text-sm">
                No problems assigned to this contest.
              </div>
            )}
          </section>

          {/* LEADERBOARD STANDINGS */}
          <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-glow space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Leaderboard Standings
            </h2>

            {contest.leaderboard && contest.leaderboard.length > 0 ? (
              <div className="border border-white/5 bg-slate-950/40 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 w-16">Rank</th>
                      <th className="px-4 py-3">Contestant</th>
                      <th className="px-4 py-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                    {contest.leaderboard.map((player) => (
                      <tr key={player.rank} className="hover:bg-white/[0.01]">
                        <td className="px-4 py-3 font-mono font-bold">
                          {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {player.name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-cyan-300">
                          {player.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-400 text-sm">
                No submissions or scoreboard entries yet.
              </div>
            )}
          </section>

        </div>

      </div>
    </UserLayout>
  );
}
