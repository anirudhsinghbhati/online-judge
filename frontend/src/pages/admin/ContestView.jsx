import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

export default function ContestView() {
  const { contestId } = useParams();
  const [contest, setContest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadContest() {
      try {
        const data = await requestJson(`/api/admin/contests/${contestId}`);
        if (!cancelled) {
          setContest(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
        }
      }
    }

    loadContest();

    return () => {
      cancelled = true;
    };
  }, [contestId]);

  if (error) {
    return (
      <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'Contest Management', to: '/admin/contest-management' }, { label: 'View Contest' }]}>
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      </AdminShell>
    );
  }

  if (!contest) {
    return (
      <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'Contest Management', to: '/admin/contest-management' }, { label: 'View Contest' }]}>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">Loading contest...</div>
      </AdminShell>
    );
  }

  async function updateContestStatus(nextStatus) {
    const data = await requestJson(`/api/admin/contests/${contestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });
    setContest(data);
  }

  async function deleteContest() {
    await requestJson(`/api/admin/contests/${contestId}`, { method: 'DELETE' });
    window.location.href = '/admin/contest-management';
  }

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'Contest Management', to: '/admin/contest-management' }, { label: 'View Contest' }]}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Contest Details</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{contest.name}</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Contest ID', contestId],
              ['Status', contest.status],
              ['Participants', contest.participants?.length || 0],
              ['Format', 'Competitive Programming']
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => updateContestStatus(contest.status === 'Active' ? 'Completed' : 'Active')} type="button" className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">
              Edit Contest
            </button>
            <button onClick={deleteContest} type="button" className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-100">
              Cancel Contest
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Leaderboard</p>
            <div className="mt-4 space-y-3">
              {contest.leaderboard?.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-200">{entry.rank}. {entry.name}</span>
                  <span className="text-sm font-semibold text-white">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Users Participating</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
              {(contest.participants || []).map((participant) => (
                <span key={participant.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{participant.name}</span>
              ))}
            </div>
          </div>

          {contest.visibility === 'Private' && contest.groups && (
            <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">Allowed Groups</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                {contest.groups.map((group) => (
                  <span key={group.id} className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-cyan-200 font-semibold">
                    {group.name}
                  </span>
                ))}
                {contest.groups.length === 0 && (
                  <span className="text-xs text-slate-500">No groups configured. Access restricted to staff only.</span>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Other Information</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Visibility', contest.visibility],
                ['Penalty', '20 minutes'],
                ['Freeze Time', '15 minutes before end'],
                ['Scoring', 'Standard ICPC']
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}