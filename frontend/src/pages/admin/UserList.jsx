import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        const data = await requestJson('/api/admin/users');
        if (!cancelled) {
          setUsers(Array.isArray(data) ? data : []);
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

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (!term) {
        return true;
      }
      return [user.id, user.name, user.email, user.role].join(' ').toLowerCase().includes(term);
    });
  }, [search, users]);

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full items-center gap-3 lg:max-w-4xl">
        <input
          type="search"
          placeholder="Search users"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
        />
      </div>
    </div>
  );

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'User Management', to: '/admin/user-management' }, { label: 'User List' }]} toolbar={toolbar}>
      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">User ID</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">User Name</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Email</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Role</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-300" colSpan={5}>Loading users...</td>
                </tr>
              ) : visibleUsers.length > 0 ? (
                visibleUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4 text-slate-200">{user.id}</td>
                    <td className="px-4 py-4 text-slate-200">{user.name}</td>
                    <td className="px-4 py-4 text-slate-200">{user.email}</td>
                    <td className="px-4 py-4 text-slate-200">{user.role}</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/admin/user-management/${user.id}`}
                        className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300/20"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-300" colSpan={5}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
