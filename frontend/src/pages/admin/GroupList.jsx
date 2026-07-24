import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

export default function GroupList() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        setLoading(true);
        const data = await requestJson('/api/admin/groups');
        if (!cancelled) {
          setGroups(Array.isArray(data) ? data : []);
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

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeleteGroup(groupId) {
    if (!window.confirm('Are you sure you want to delete this group? Members will not be deleted.')) {
      return;
    }

    try {
      setDeletingId(groupId);
      await requestJson(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
      setGroups(current => current.filter(g => g.id !== groupId));
    } catch (err) {
      setError('Failed to delete group: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (!term) return true;
      return [group.id, group.name, group.description].join(' ').toLowerCase().includes(term);
    });
  }, [search, groups]);

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full items-center gap-3 lg:max-w-4xl">
        <input
          type="search"
          placeholder="Search groups"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
        />
      </div>
      <Link
        to="/admin/group-management/add"
        className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        Create Group
      </Link>
    </div>
  );

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'User Management', to: '/admin/user-management' }, { label: 'Group List' }]} toolbar={toolbar}>
      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Group ID</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Group Name</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Description</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Member Count</th>
                <th className="px-4 py-3 font-medium uppercase tracking-[0.28em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-300" colSpan={5}>Loading groups...</td>
                </tr>
              ) : visibleGroups.length > 0 ? (
                visibleGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4 text-slate-200">{group.id}</td>
                    <td className="px-4 py-4 text-slate-200 font-semibold">{group.name}</td>
                    <td className="px-4 py-4 text-slate-300">{group.description || '-'}</td>
                    <td className="px-4 py-4 text-slate-200 font-mono">{group.member_count}</td>
                    <td className="px-4 py-4 space-x-2">
                      <Link
                        to={`/admin/group-management/${group.id}`}
                        className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/20"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={deletingId === group.id}
                        className="inline-flex items-center rounded-full border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-50"
                      >
                        {deletingId === group.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-300" colSpan={5}>No groups found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
