import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

const filters = ['All', 'Easy', 'Medium', 'Hard'];

export default function ProblemManagement() {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProblems() {
      try {
        setLoading(true);
        const data = await requestJson('/api/admin/problems');
        if (!cancelled) {
          setProblems(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProblems();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProblems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...problems]
      .filter((problem) => {
        const matchesSearch = !term || [problem.id, problem.title, problem.difficulty, problem.topic]
          .join(' ')
          .toLowerCase()
          .includes(term);

        const matchesFilter = selectedFilter === 'All' || problem.difficulty === selectedFilter;

        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => Number(right.id) - Number(left.id));
  }, [problems, search, selectedFilter]);

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-col gap-3 lg:max-w-5xl">
        <input
          type="search"
          placeholder="Search problems"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100 font-semibold'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      <Link
        to="/admin/problem-management/add"
        className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        Add
      </Link>
    </div>
  );

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'Problem Management' }]} toolbar={toolbar}>
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-400">
        <p>Default sort: Last added</p>
        <p>{visibleProblems.length} problems</p>
      </div>

      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Problem No.</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Problem Name</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Access</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Difficulty</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Topic</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Last Added</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-300" colSpan={7}>
                    Loading problems...
                  </td>
                </tr>
              ) : visibleProblems.length > 0 ? (
                visibleProblems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4 text-slate-200">{problem.id}</td>
                    <td className="px-4 py-4 text-slate-200">{problem.title}</td>
                    <td className="px-4 py-4 text-slate-200">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        problem.isPractice
                          ? 'bg-emerald-400/10 text-emerald-300'
                          : 'bg-amber-400/10 text-amber-300'
                      }`}>
                        {problem.isPractice ? 'Public' : 'Reserve for Contest'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-200">{problem.difficulty}</td>
                    <td className="px-4 py-4 text-slate-200">{problem.topic}</td>
                    <td className="px-4 py-4 text-slate-200">{problem.updated_at || problem.created_at || '-'}</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/admin/problem-management/${problem.id}`}
                        className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300/20"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-300" colSpan={7}>
                    No problems found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      </div>
    </AdminShell>
  );
}