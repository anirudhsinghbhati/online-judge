import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

export default function UserManagement() {
  const [userCount, setUserCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        setLoading(true);
        const [users, groups] = await Promise.all([
          requestJson('/api/admin/users'),
          requestJson('/api/admin/groups')
        ]);
        if (!cancelled) {
          setUserCount(Array.isArray(users) ? users.length : 0);
          setGroupCount(Array.isArray(groups) ? groups.length : 0);
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

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'User Management' }]}>
      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* USERS CARD */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-xl transition duration-200 hover:border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            {loading ? (
              <div className="h-5 w-16 animate-pulse rounded bg-white/10" />
            ) : (
              <span className="text-2xl font-extrabold text-white">{userCount} Users</span>
            )}
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-bold text-white">Users Directory</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Browse, view stats, monitor activities, and modify statuses of all registered user profiles on the platform.
            </p>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4">
            <Link
              to="/admin/user-management/users"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/20"
            >
              View User List
            </Link>
          </div>
        </div>

        {/* GROUPS CARD */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-xl transition duration-200 hover:border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            {loading ? (
              <div className="h-5 w-16 animate-pulse rounded bg-white/10" />
            ) : (
              <span className="text-2xl font-extrabold text-white">{groupCount} Groups</span>
            )}
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-bold text-white">Groups Manager</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Organize users into groups to set up private contests that are restricted to selected groups.
            </p>
          </div>
          <div className="mt-8 flex gap-3 border-t border-white/5 pt-4">
            <Link
              to="/admin/group-management"
              className="flex-1 inline-flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/20"
            >
              View Groups
            </Link>
            <Link
              to="/admin/group-management/add"
              className="flex-1 inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Create Group
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}