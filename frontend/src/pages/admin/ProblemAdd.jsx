import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminShell from '../../components/AdminShell';
import { requestJson } from '../../lib/adminApi';

// RFC 4180 compliant CSV parser
function parseCSV(text) {
  const rows = [];
  let row = [];
  let col = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          col += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        col += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(col);
        col = '';
      } else if (char === '\r' || char === '\n') {
        row.push(col);
        col = '';
        if (row.some(x => x !== '')) {
          rows.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        col += char;
      }
    }
  }
  if (col || row.length > 0) {
    row.push(col);
    if (row.some(x => x !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

export default function ProblemAdd() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    topic: 'General',
    constraints: '',
    imageUrl: '',
    isPractice: true,
    officialSolution: '',
    testcases: [
      { input_data: '', expected_output: '', visibility: 'visible', sort_order: 0 },
      { input_data: '', expected_output: '', visibility: 'visible', sort_order: 1 },
      { input_data: '', expected_output: '', visibility: 'hidden', sort_order: 2 },
      { input_data: '', expected_output: '', visibility: 'hidden', sort_order: 3 }
    ]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTestcase(index, field, value) {
    setForm((current) => {
      const nextTestcases = [...current.testcases];
      nextTestcases[index] = {
        ...nextTestcases[index],
        [field]: value
      };
      return { ...current, testcases: nextTestcases };
    });
  }

  function addTestcase() {
    if (form.testcases.length >= 10) return;
    setForm((current) => ({
      ...current,
      testcases: [
        ...current.testcases,
        {
          input_data: '',
          expected_output: '',
          visibility: 'visible',
          sort_order: current.testcases.length
        }
      ]
    }));
  }

  function removeTestcase(index) {
    if (form.testcases.length <= 1) return;
    setForm((current) => ({
      ...current,
      testcases: current.testcases.filter((_, i) => i !== index)
    }));
  }

  function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);
        if (!parsed || parsed.length === 0) {
          setError('Invalid or empty CSV file.');
          return;
        }
        
        let startRow = 1;
        let inputIdx = 0;
        let outputIdx = 1;
        let visibilityIdx = -1;
        
        const firstRow = parsed[0].map(h => h.trim().toLowerCase());
        const isHeader = firstRow.some(h => h.includes('input') || h.includes('output') || h.includes('expected') || h.includes('visibility'));
        
        if (isHeader) {
          inputIdx = firstRow.findIndex(h => h.includes('input'));
          outputIdx = firstRow.findIndex(h => h.includes('output') || h.includes('expected'));
          visibilityIdx = firstRow.findIndex(h => h.includes('visibility') || h.includes('type'));
          startRow = 1;
        } else {
          startRow = 0;
          inputIdx = 0;
          outputIdx = 1;
          visibilityIdx = -1;
        }
        
        if (inputIdx === -1 || outputIdx === -1) {
          setError('Could not find input/output columns in CSV. Please make sure headers contain "input" and "output".');
          return;
        }
        
        const newTestcases = [];
        for (let i = startRow; i < parsed.length; i++) {
          const row = parsed[i];
          if (row.length <= Math.max(inputIdx, outputIdx)) continue;
          
          const input_data = row[inputIdx] || '';
          const expected_output = row[outputIdx] || '';
          let visibility = 'visible';
          
          if (visibilityIdx !== -1 && row[visibilityIdx]) {
            const visStr = row[visibilityIdx].trim().toLowerCase();
            if (visStr.includes('hidden') || visStr.includes('judge') || visStr === '0' || visStr === 'false') {
              visibility = 'hidden';
            }
          } else {
            visibility = (newTestcases.length < 2) ? 'visible' : 'hidden';
          }
          
          newTestcases.push({
            input_data,
            expected_output,
            visibility,
            sort_order: newTestcases.length
          });
        }
        
        if (newTestcases.length === 0) {
          setError('No valid test cases found in CSV.');
          return;
        }
        
        if (newTestcases.length > 10) {
          setError('A maximum of 10 testcases is allowed. Only the first 10 testcases were imported.');
        }
        
        const truncated = newTestcases.slice(0, 10);
        setForm(current => ({
          ...current,
          testcases: truncated
        }));
        setError('');
      } catch (err) {
        setError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const payload = {
        title: form.title,
        description: form.description,
        difficulty: form.difficulty,
        topic: form.topic,
        constraints: form.constraints,
        imageUrl: form.imageUrl,
        isPractice: form.isPractice,
        officialSolution: form.officialSolution,
        testcases: form.testcases
      };

      await requestJson('/api/admin/problems', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      navigate('/admin/problem-management');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }, { label: 'Problem Management', to: '/admin/problem-management' }, { label: 'Add Problem' }]}>
      {error ? <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-5 sm:p-6">
        
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-200 md:col-span-2">
            <span className="text-slate-400">Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100"
              required
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Difficulty</span>
            <select value={form.difficulty} onChange={(event) => updateField('difficulty', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Topic</span>
            <input
              type="text"
              value={form.topic}
              onChange={(event) => updateField('topic', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Visibility</span>
            <select
              value={form.isPractice ? 'public' : 'contest'}
              onChange={(event) => updateField('isPractice', event.target.value === 'public')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyan-300/40 text-slate-100"
            >
              <option value="public">Public (Practice Arena)</option>
              <option value="contest">Reserve for Contests</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-200 md:col-span-3">
            <span className="text-slate-400">Problem Description</span>
            <textarea
              rows="8"
              placeholder="Write plain text or markdown..."
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
              required
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Image URL</span>
            <input
              type="text"
              placeholder="Image URL"
              value={form.imageUrl}
              onChange={(event) => updateField('imageUrl', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Constraint</span>
            <input
              type="text"
              placeholder="e.g. 1 <= n <= 2 * 10^5"
              value={form.constraints}
              onChange={(event) => updateField('constraints', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 text-slate-100"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200 md:col-span-2">
            <span className="text-slate-400">Official Solution</span>
            <textarea
              rows="6"
              placeholder="Paste official code solution or text description here..."
              value={form.officialSolution}
              onChange={(event) => updateField('officialSolution', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 font-mono text-slate-100"
            />
          </label>
        </div>

        {/* CSV IMPORT OPTION */}
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm font-semibold text-slate-300">Or import testcases directly from a CSV file</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="mt-4 mx-auto block max-w-sm text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-400 file:text-slate-950 hover:file:bg-cyan-300 cursor-pointer"
          />
          <p className="text-xs text-slate-500 mt-2">CSV must contain column headers matching "input" and "output". Maximum 10 testcases.</p>
        </div>

        {/* TEST CASES SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Test Cases</h3>
              <p className="text-xs text-slate-400 mt-1">Configure sample (visible) or judge execution (hidden) cases. Maximum 10.</p>
            </div>
            <button
              type="button"
              onClick={addTestcase}
              disabled={form.testcases.length >= 10}
              className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20 disabled:opacity-50"
            >
              Add Test Case
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {form.testcases.map((tc, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Test Case #{index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={tc.visibility}
                      onChange={(e) => updateTestcase(index, 'visibility', e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="visible">Visible (Sample Case)</option>
                      <option value="hidden">Hidden (Judge Case)</option>
                    </select>
                    {form.testcases.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeTestcase(index)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="space-y-1 text-xs text-slate-400">
                    <span>Input</span>
                    <textarea
                      rows="3"
                      value={tc.input_data}
                      onChange={(e) => updateTestcase(index, 'input_data', e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 font-mono text-xs text-slate-300 outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span>Expected Output</span>
                    <textarea
                      rows="3"
                      value={tc.expected_output}
                      onChange={(e) => updateTestcase(index, 'expected_output', e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 font-mono text-xs text-slate-300 outline-none"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/problem-management')}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Problem'}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}