import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

function localToUtc(dateStr, timeStr) {
  if (!dateStr || !timeStr) return { date: dateStr, time: timeStr };
  // Ensure timeStr has seconds
  const cleanTime = timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
  const localDt = new Date(`${dateStr}T${cleanTime}`);
  if (isNaN(localDt.getTime())) return { date: dateStr, time: timeStr };
  
  const utcStr = localDt.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  const [utcDate, utcTimeWithMs] = utcStr.split('T');
  const utcTime = utcTimeWithMs.split('.')[0]; // HH:mm:ss
  return { date: utcDate, time: utcTime };
}

export default function ContestCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    contestName: '',
    contestCode: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    duration: '',
    visibility: 'Public',
    allowedUsers: '',
    status: 'Upcoming'
  });
  const [problems, setProblems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [problemSearch, setProblemSearch] = useState('');
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [problemsData, groupsData] = await Promise.all([
          requestJson('/api/admin/problems'),
          requestJson('/api/admin/groups')
        ]);
        if (!cancelled) {
          setProblems(Array.isArray(problemsData) ? problemsData : []);
          setGroups(Array.isArray(groupsData) ? groupsData : []);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamically calculate duration from start date/time and end date/time
  useEffect(() => {
    const { startDate, startTime, endDate, endTime } = form;
    if (!startDate || !startTime || !endDate || !endTime) {
      return;
    }

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      const diffMs = endDateTime - startDateTime;

      if (diffMs > 0) {
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        let calculatedDuration = '';
        if (hours > 0) {
          calculatedDuration += `${hours} hr${hours > 1 ? 's' : ''}`;
        }
        if (mins > 0) {
          if (calculatedDuration) calculatedDuration += ' ';
          calculatedDuration += `${mins} min${mins > 1 ? 's' : ''}`;
        }
        if (calculatedDuration === '') {
          calculatedDuration = '0 mins';
        }

        setForm((current) => ({ ...current, duration: calculatedDuration }));
      } else {
        setForm((current) => ({ ...current, duration: '' }));
      }
    } catch (err) {
      console.error('Error calculating duration:', err);
    }
  }, [form.startDate, form.startTime, form.endDate, form.endTime]);

  const filteredProblems = useMemo(() => {
    const term = problemSearch.trim().toLowerCase();
    return problems.filter((p) => {
      if (!term) return true;
      return [p.id, p.title, p.topic, p.difficulty].join(' ').toLowerCase().includes(term);
    });
  }, [problems, problemSearch]);

  function toggleProblemSelection(problemId) {
    setSelectedProblems((current) =>
      current.includes(problemId)
        ? current.filter((id) => id !== problemId)
        : [...current, problemId]
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

      const startUtc = localToUtc(form.startDate, form.startTime);
      const endUtc = localToUtc(form.endDate, form.endTime);

      await requestJson('/api/admin/contests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startDate: startUtc.date,
          startTime: startUtc.time,
          endDate: endUtc.date,
          endTime: endUtc.time,
          problemIds: selectedProblems,
          groupIds: selectedGroupIds
        })
      });

      navigate('/admin/contest-management');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'Contest Management', to: '/admin/contest-management' }, { label: 'Create Contest' }]}>
      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl rounded-[24px] border border-white/10 bg-slate-950/55 p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['Contest Name', 'text', false],
            ['Contest Code', 'text', false],
            ['Start Date', 'date', false],
            ['Start Time', 'time', false],
            ['End Date', 'date', false],
            ['End Time', 'time', false],
            ['Duration', 'text', true]
          ].map(([label, type, isReadOnly]) => {
            const fieldKey = label
              .replace(/\s+/g, '')
              .replace('ContestName', 'contestName')
              .replace('ContestCode', 'contestCode')
              .replace('StartDate', 'startDate')
              .replace('StartTime', 'startTime')
              .replace('EndDate', 'endDate')
              .replace('EndTime', 'endTime')
              .replace('Duration', 'duration');

            return (
              <label key={label} className="space-y-2 text-sm text-slate-200">
                <span className="text-slate-400">{label}</span>
                <input
                  value={form[fieldKey]}
                  onChange={(event) => updateField(fieldKey, event.target.value)}
                  type={type}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100 transition-colors ${
                    isReadOnly
                      ? 'border-white/5 bg-slate-900/40 text-slate-400 cursor-not-allowed font-semibold'
                      : 'border-white/10 bg-white/5'
                  }`}
                  required
                  readOnly={isReadOnly}
                />
              </label>
            );
          })}

          <label className="space-y-2 text-sm text-slate-200 md:col-span-2">
            <span className="text-slate-400">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows="4"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Visibility Settings</span>
            <select
              value={form.visibility}
              onChange={(event) => updateField('visibility', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100 cursor-pointer"
            >
              <option>Public</option>
              <option>Private</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Contest Access Control</span>
            <input
              value={form.allowedUsers}
              onChange={(event) => updateField('allowedUsers', event.target.value)}
              type="text"
              placeholder="Allowed Users"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
            />
          </label>

          {/* PRIVATE GROUP SELECTOR */}
          {form.visibility === 'Private' && (
            <div className="space-y-2 text-sm text-slate-200 md:col-span-2">
              <span className="text-slate-400">Select Allowed Groups</span>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 grid gap-3 sm:grid-cols-2 max-h-48 overflow-y-auto scrollbar-thin">
                {groups.map((group) => {
                  const isChecked = selectedGroupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedGroupIds(curr =>
                            curr.includes(group.id) ? curr.filter(id => id !== group.id) : [...curr, group.id]
                          );
                        }}
                        className="h-4 w-4 rounded border-white/10 text-cyan-400 focus:ring-cyan-400/30 bg-transparent cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-slate-200 block text-sm">{group.name}</span>
                        <span className="text-xs text-slate-400">{group.member_count} members</span>
                      </div>
                    </label>
                  );
                })}
                {groups.length === 0 && (
                  <p className="text-slate-400 text-sm col-span-2 p-2 text-center">No groups found. Please create a group first.</p>
                )}
              </div>
            </div>
          )}

          <label className="space-y-2 text-sm text-slate-200 md:col-span-2">
            <span className="text-slate-400">Contest Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100 cursor-pointer"
            >
              <option>Upcoming</option>
              <option>Active</option>
              <option>Completed</option>
              <option>Canceled</option>
            </select>
          </label>

          {/* PROBLEM SELECTION UI ENHANCEMENT */}
          <div className="space-y-2 text-sm text-slate-200 md:col-span-2">
            <span className="text-slate-400">Select Problems ({selectedProblems.length} Selected)</span>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 space-y-4">
              <input
                type="search"
                placeholder="Search problems by name, topic, or difficulty..."
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
              />

              <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-white/5 pr-1 scrollbar-thin">
                {filteredProblems.map((p) => {
                  const isSelected = selectedProblems.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProblemSelection(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-cyan-400/10 border border-cyan-300/30'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{p.title}</p>
                        <p className="text-xs text-slate-400 mt-1">Topic: {p.topic} | Difficulty: {p.difficulty}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isSelected
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                  );
                })}
                {filteredProblems.length === 0 && (
                  <p className="text-sm text-slate-400 p-2">No problems found.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/contest-management')}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create Contest'}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}