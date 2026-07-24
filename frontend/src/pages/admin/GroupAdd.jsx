import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

export default function GroupAdd() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const isEdit = Boolean(groupId);

  const [form, setForm] = useState({
    name: '',
    description: ''
  });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const usersData = await requestJson('/api/admin/users');
        
        let initialForm = { name: '', description: '' };
        let initialSelected = [];

        if (isEdit) {
          const groupData = await requestJson(`/api/admin/groups/${groupId}`);
          initialForm = {
            name: groupData.name || '',
            description: groupData.description || ''
          };
          initialSelected = Array.isArray(groupData.userIds) ? groupData.userIds : [];
        }

        if (!cancelled) {
          setUsers(Array.isArray(usersData) ? usersData : []);
          setForm(initialForm);
          setSelectedUserIds(initialSelected);
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

    loadData();

    return () => {
      cancelled = true;
    };
  }, [groupId, isEdit]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (!term) return true;
      return [u.id, u.name, u.email, u.role].join(' ').toLowerCase().includes(term);
    });
  }, [users, userSearch]);

  function toggleUserSelection(userId) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');

      const payload = {
        name: form.name,
        description: form.description,
        userIds: selectedUserIds
      };

      if (isEdit) {
        await requestJson(`/api/admin/groups/${groupId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await requestJson('/api/admin/groups', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      navigate('/admin/group-management');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'User Management', to: '/admin/user-management' }, { label: 'Group List', to: '/admin/group-management' }, { label: isEdit ? 'Edit Group' : 'Create Group' }]}>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-slate-300">
          Loading details...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'User Management', to: '/admin/user-management' }, { label: 'Group List', to: '/admin/group-management' }, { label: isEdit ? 'Edit Group' : 'Create Group' }]}>
      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        
        {/* GROUP INFO DETAILS COLUMN */}
        <section className="space-y-4 rounded-[24px] border border-white/10 bg-slate-950/55 p-5 sm:p-6 self-start">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Group Metadata</p>
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Update Group Info' : 'New Group Configuration'}</h2>

          <label className="block space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Group Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100"
              required
              placeholder="e.g. Batch of 2026 - CSE A"
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Description</span>
            <textarea
              rows="6"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100"
              placeholder="Provide context or guidelines for this student group..."
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/group-management')}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </section>

        {/* MEMBERS CHECKLIST SELECTION COLUMN */}
        <section className="space-y-4 rounded-[24px] border border-white/10 bg-slate-950/55 p-5 sm:p-6 flex flex-col h-[500px]">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Group Pool</p>
              <h2 className="text-lg font-bold text-white">Select Members ({selectedUserIds.length} Selected)</h2>
            </div>
          </div>

          <input
            type="search"
            placeholder="Search users by name, email, or role..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
          />

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-white/5 scrollbar-thin">
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-cyan-400/10 border border-cyan-300/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email} | {user.role}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // toggling is handled by outer div click
                    className="h-4 w-4 rounded border-white/10 text-cyan-400 focus:ring-cyan-400/30 bg-transparent"
                  />
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-slate-400 p-4 text-center">No users found.</p>
            )}
          </div>
        </section>

      </form>
    </AdminShell>
  );
}
