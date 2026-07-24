import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';

import MonacoEditor from '../components/MonacoEditor';
import ResultPanel from '../components/ResultPanel';
import { DEFAULT_LANGUAGE_KEY, LANGUAGE_OPTIONS, getLanguageOption, formatContestDateTime } from '../constants';
import UserLayout from '../components/UserLayout';

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

function UserWorkspace() {
  const { problemId } = useParams();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contestId');
  const navigate = useNavigate();

  const selectedProblemId = Number(problemId);

  const [problems, setProblems] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [selectedProblem, setSelectedProblem] = useState(null);
  
  const [selectedLanguageKey, setSelectedLanguageKey] = useState(DEFAULT_LANGUAGE_KEY);
  const [code, setCode] = useState(getLanguageOption(DEFAULT_LANGUAGE_KEY).starterCode);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [runningCode, setRunningCode] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [error, setError] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('description');
  const [activeBottomTab, setActiveBottomTab] = useState('result');
  const [activeTestcaseIndex, setActiveTestcaseIndex] = useState(0);
  const [contestTimeLeft, setContestTimeLeft] = useState('');

  // Submissions states
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);

  // Unsaved Warning / Draft states
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

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

  // Active contest countdown timer
  useEffect(() => {
    if (!selectedContest || selectedContest.status !== 'Active') {
      setContestTimeLeft('');
      return;
    }

    function updateTimeLeft() {
      const endStr = getYYYYMMDD(selectedContest.end_date);
      const endObj = new Date(`${endStr}T${selectedContest.end_time}Z`);
      const now = new Date();
      const diff = endObj - now;

      if (diff <= 0) {
        setContestTimeLeft('Ended');
        navigate(`/user/contests/${contestId}?ended=true`, { replace: true });
        return;
      }

      const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setContestTimeLeft(`${hrs}:${mins}:${secs}`);
    }

    updateTimeLeft();
    const timerId = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timerId);
  }, [selectedContest, contestId, navigate]);

  // Tab locking effect: lock Solutions tab during active contests
  useEffect(() => {
    if (contestId && selectedContest?.status === 'Active') {
      if (activeMainTab === 'solutions') {
        setActiveMainTab('description');
      }
    }
  }, [contestId, selectedContest, activeMainTab]);

  // Load practice problems list
  useEffect(() => {
    let cancelled = false;

    async function loadProblems() {
      try {
        setLoadingProblems(true);
        setError('');
        const data = await requestJson('/api/problems');

        if (!cancelled) {
          setProblems(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingProblems(false);
        }
      }
    }

    loadProblems();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load contest details if contestId is provided
  useEffect(() => {
    if (!contestId) {
      setSelectedContest(null);
      return;
    }

    let cancelled = false;

    async function loadContest() {
      try {
        const userId = localStorage.getItem('demo_active_user_id') || 0;
        const data = await requestJson(`/api/contests/${contestId}?userId=${userId}`);
        if (!cancelled) {
          setSelectedContest(data);
          if (data.status === 'Completed') {
            navigate(`/user/contests/${contestId}?ended=true`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to load contest details:', err);
      }
    }

    loadContest();

    return () => {
      cancelled = true;
    };
  }, [contestId, navigate]);

  // Fetch problem details when selectedProblemId changes
  useEffect(() => {
    if (!selectedProblemId) {
      setSelectedProblem(null);
      return;
    }

    let cancelled = false;

    async function loadProblem() {
      try {
        setLoadingProblem(true);
        setError('');
        const data = await requestJson(`/api/problems/${selectedProblemId}`);

        if (!cancelled) {
          setSelectedProblem(data);
          
          const userId = localStorage.getItem('demo_active_user_id') || 0;
          const draftKey = `code_draft_${userId}_${selectedProblemId}_${selectedLanguageKey}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft !== null) {
            setCode(savedDraft);
          } else {
            setCode(getLanguageOption(selectedLanguageKey).starterCode);
          }
          setIsDirty(false);
          
          setRunResult(null);
          setSubmitResult(null);
          setActiveTestcaseIndex(0);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingProblem(false);
        }
      }
    }

    loadProblem();

    return () => {
      cancelled = true;
    };
  }, [selectedProblemId]);

  // Load submissions for current user and problem on demand when tab changes
  useEffect(() => {
    if (activeMainTab === 'submissions' && selectedProblemId) {
      const activeUserId = localStorage.getItem('demo_active_user_id');
      if (!activeUserId) return;

      let cancelled = false;
      async function fetchSubmissions() {
        try {
          setLoadingSubmissions(true);
          const data = await requestJson(`/api/users/${activeUserId}/problems/${selectedProblemId}/submissions`);
          if (!cancelled) {
            setSubmissions(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error('Failed to load submissions:', err);
        } finally {
          if (!cancelled) {
            setLoadingSubmissions(false);
          }
        }
      }
      fetchSubmissions();
      return () => {
        cancelled = true;
      };
    }
  }, [activeMainTab, selectedProblemId]);

  // Intercept navigation links click to block if editor is dirty
  useEffect(() => {
    if (!isDirty) return;

    function handleCaptureClick(event) {
      const anchor = event.target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('#')) {
          // Block React Router navigation click
          event.preventDefault();
          event.stopPropagation();
          setPendingNavigation({ type: 'url', target: href });
          setShowUnsavedModal(true);
        }
      }
    }

    document.addEventListener('click', handleCaptureClick, true);
    return () => document.removeEventListener('click', handleCaptureClick, true);
  }, [isDirty]);

  // Prevent browser window unload/refresh when dirty
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const activeResult = useMemo(() => submitResult || runResult, [runResult, submitResult]);
  const testcases = Array.isArray(selectedProblem?.testcases) ? selectedProblem.testcases : [];
  const activeTestcase = testcases[activeTestcaseIndex] || testcases[0] || null;
  const selectedLanguage = getLanguageOption(selectedLanguageKey);

  // Compute what problems to show in the dropdown based on context
  const problemsToShow = useMemo(() => {
    if (!contestId) {
      return problems;
    }
    if (selectedContest && (selectedContest.status === 'Active' || selectedContest.status === 'Completed')) {
      return selectedContest.problems || [];
    }
    return [];
  }, [contestId, selectedContest, problems]);

  function selectProblem(problemId) {
    if (isDirty) {
      setPendingNavigation({ type: 'problem', target: problemId });
      setShowUnsavedModal(true);
      return;
    }
    if (contestId) {
      navigate(`/user/problems/${problemId}?contestId=${contestId}`);
    } else {
      navigate(`/user/problems/${problemId}`);
    }
    setError('');
    setRunResult(null);
    setSubmitResult(null);
    setActiveTestcaseIndex(0);
    setActiveBottomTab('result');
  }

  function handleLanguageChange(nextLanguageKey) {
    const nextLanguage = getLanguageOption(nextLanguageKey);
    setSelectedLanguageKey(nextLanguage.key);
    
    const userId = localStorage.getItem('demo_active_user_id') || 0;
    const draftKey = `code_draft_${userId}_${selectedProblemId}_${nextLanguageKey}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft !== null) {
      setCode(savedDraft);
    } else {
      setCode(nextLanguage.starterCode);
    }
    setIsDirty(false);

    setRunResult(null);
    setSubmitResult(null);
    setError('');
  }

  function handleCodeChange(newCode) {
    setCode(newCode);
    const userId = localStorage.getItem('demo_active_user_id') || 0;
    const draftKey = `code_draft_${userId}_${selectedProblemId}_${selectedLanguageKey}`;
    const savedDraft = localStorage.getItem(draftKey);
    const baseline = savedDraft !== null ? savedDraft : getLanguageOption(selectedLanguageKey).starterCode;
    setIsDirty(newCode !== baseline);
  }

  function handleSaveCode() {
    const userId = localStorage.getItem('demo_active_user_id') || 0;
    const draftKey = `code_draft_${userId}_${selectedProblemId}_${selectedLanguageKey}`;
    localStorage.setItem(draftKey, code);
    setIsDirty(false);
  }

  function renderTabButton(label, isActive, onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-full px-4 py-2 text-sm transition ${isActive
          ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        {label}
      </button>
    );
  }

  async function handleRunCode() {
    if (!code.trim()) {
      setError('Please enter code before running it.');
      return;
    }

    try {
      setRunningCode(true);
      setError('');
      setSubmitResult(null);
      setActiveBottomTab('result');
      const data = await requestJson('/api/run', {
        method: 'POST',
        body: JSON.stringify({
          code,
          problemId: selectedProblemId,
          languageId: selectedLanguage.judge0LanguageId,
          compilerOptions: selectedLanguage.compilerOptions
        })
      });

      setRunResult(data);
    } catch (runError) {
      setRunResult(null);
      setError(runError.message);
    } finally {
      setRunningCode(false);
    }
  }

  async function handleSubmitCode() {
    if (!selectedProblemId) {
      setError('Select a problem before submitting.');
      return;
    }

    if (!code.trim()) {
      setError('Please enter code before submitting it.');
      return;
    }

    try {
      setSubmittingCode(true);
      setError('');
      setRunResult(null);
      setActiveBottomTab('result');
      const activeUserId = localStorage.getItem('demo_active_user_id');

      const data = await requestJson('/api/submit', {
        method: 'POST',
        body: JSON.stringify({
          code,
          problemId: selectedProblemId,
          languageId: selectedLanguage.judge0LanguageId,
          compilerOptions: selectedLanguage.compilerOptions,
          userId: activeUserId ? Number(activeUserId) : null // Pass simulated user ID to log submission
        })
      });

      setSubmitResult(data);
    } catch (submitError) {
      setSubmitResult(null);
      setError(submitError.message);
    } finally {
      setSubmittingCode(false);
    }
  }

  return (
    <UserLayout fullWidth>
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {error ? (
          <div className="mb-2 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {/* RENDER LOCKOUT OVERLAY IF CONTEST IS UPCOMING */}
        {selectedContest && selectedContest.status === 'Upcoming' ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 p-8 text-center backdrop-blur-xl shadow-glow min-h-[500px]">
            <span className="text-5xl mb-6 animate-pulse select-none">🔒</span>
            <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Contest is Locked</h3>
            <p className="mt-4 text-slate-300 max-w-md text-sm leading-relaxed">
              The contest <span className="font-semibold text-cyan-300">"{selectedContest.contest_name}"</span> has not started yet. It is scheduled to start at:
            </p>
            <div className="mt-4 bg-white/5 rounded-xl px-6 py-4 border border-white/5 font-mono text-cyan-200">
              {formatContestDateTime(selectedContest.start_date, selectedContest.start_time)}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Duration: {selectedContest.duration} | Access: {selectedContest.visibility}
            </p>
          </div>
        ) : (
          // RENDER CODING CONSOLE
          <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] flex-1 min-h-0 overflow-hidden p-2">
            <div className="flex flex-col gap-2 h-full overflow-hidden">
              {/* Navigation / Mode Top Panel */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Back link */}
                  <Link
                    to={contestId ? `/user/contests/${contestId}` : '/user/practice'}
                    className="text-xs font-semibold text-slate-400 hover:text-cyan-300 transition pr-2 flex items-center gap-1"
                  >
                    &larr; {contestId ? 'Back to Contest' : 'Back to Practice'}
                  </Link>

                  <span className="text-slate-600 font-mono">|</span>

                  {/* Current Context Mode tag */}
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${contestId ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'}`} />
                    {contestId ? `Contest: ${selectedContest?.contest_name || 'Loading...'}` : 'Practice Arena'}
                  </div>

                  {/* Problem Selector Dropdown */}
                  {problemsToShow.length > 0 && (
                    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-slate-300">
                      <span className="text-slate-500">Workspace Problem:</span>
                      <select
                        value={selectedProblemId || ''}
                        onChange={(event) => selectProblem(Number(event.target.value))}
                        className="bg-transparent text-slate-100 outline-none font-semibold cursor-pointer"
                      >
                        {problemsToShow.map((problem) => (
                          <option key={problem.id} value={problem.id} className="bg-slate-950 text-slate-100">
                            #{problem.id} {problem.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                </div>

                {/* Active Contest Countdown Timer */}
                {contestId && selectedContest?.status === 'Active' && contestTimeLeft && (
                  <div className="text-xs font-bold font-mono text-rose-400 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-full px-3.5 py-1.5 animate-pulse shrink-0">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Time Left: {contestTimeLeft}</span>
                  </div>
                )}
              </div>

              <aside className="glass-panel flex flex-1 flex-col overflow-hidden rounded-xl shadow-glow border border-white/10 bg-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5 bg-slate-950/20">
                <div className="flex flex-wrap items-center gap-1.5">
                  {renderTabButton('Description', activeMainTab === 'description', () => setActiveMainTab('description'))}
                  {contestId && selectedContest?.status === 'Active' ? (
                    <>
                      {renderTabButton('🔒 Solutions', activeMainTab === 'solutions', () => {
                        setError('Solutions are locked during the active contest.');
                      })}
                    </>
                  ) : (
                    <>
                      {renderTabButton('Solutions', activeMainTab === 'solutions', () => setActiveMainTab('solutions'))}
                    </>
                  )}
                  {renderTabButton('Submissions', activeMainTab === 'submissions', () => setActiveMainTab('submissions'))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-3 scrollbar-thin">
                {loadingProblem ? (
                  <div className="space-y-4">
                    <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                    <div className="h-4 w-11/12 animate-pulse rounded bg-white/5" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
                  </div>
                ) : activeMainTab === 'description' && selectedProblem ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Description</p>
                      <h3 className="mt-2 text-3xl font-semibold text-white">{selectedProblem.title}</h3>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-3 py-1 font-semibold ${
                          selectedProblem.difficulty === 'Hard'
                            ? 'bg-rose-400/15 text-rose-200'
                            : selectedProblem.difficulty === 'Medium'
                              ? 'bg-amber-400/15 text-amber-200'
                              : 'bg-emerald-400/15 text-emerald-200'
                        }`}>
                          {selectedProblem.difficulty}
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">Problem #{selectedProblem.id}</span>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">
                          {testcases.length} testcase{testcases.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{selectedProblem.description}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <h4 className="text-sm font-semibold text-white">Sample Testcases</h4>
                      <div className="mt-4 space-y-3">
                        {testcases.length > 0 ? (
                          testcases.map((testcase, index) => {
                            return (
                              <div
                                key={`${index}-${testcase.input_data}`}
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-left"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-white">Testcase #{index + 1}</span>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Input</p>
                                    <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950/80 p-3 text-sm text-slate-200 scrollbar-thin">
                                      {testcase.input_data || '-'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Expected</p>
                                    <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950/80 p-3 text-sm text-slate-200 scrollbar-thin">
                                      {testcase.expected_output || '-'}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-300">
                            No testcases found for this problem.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeMainTab === 'solutions' && selectedProblem ? (
                  <div className="space-y-4 h-full flex flex-col min-h-0">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Official Solution</h3>
                      <p className="text-xs text-slate-400 mt-1">Review the official approach and implementation for this problem.</p>
                    </div>
                    {selectedProblem.officialSolution ? (
                      <div className="flex-1 min-h-[350px] border border-white/10 rounded-2xl overflow-hidden bg-slate-950/40">
                        <MonacoEditor
                          value={selectedProblem.officialSolution}
                          language={selectedLanguage.monacoLanguage}
                          readOnly={true}
                          height="100%"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-400">
                        No official solution has been posted for this problem yet.
                      </div>
                    )}
                  </div>
                ) : activeMainTab === 'submissions' && selectedProblem ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Submission History</h3>
                      <p className="text-xs text-slate-400 mt-1">Review your past code submissions and results for this problem.</p>
                    </div>

                    {loadingSubmissions ? (
                      <div className="space-y-3">
                        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
                      </div>
                    ) : submissions.length > 0 ? (
                      <div className="space-y-3">
                        {submissions.map((sub) => {
                          const isExpanded = expandedSubmissionId === sub.id;
                          const formattedTime = new Date(sub.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                          
                          const langLabel = LANGUAGE_OPTIONS.find(l => l.judge0LanguageId === sub.language_id)?.label || 'Code';

                          let verdictColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
                          if (sub.verdict === 'Accepted') {
                            verdictColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                          } else if (sub.verdict === 'Wrong Answer') {
                            verdictColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                          } else if (sub.verdict === 'Time Limit Exceeded') {
                            verdictColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                          } else if (sub.verdict === 'Runtime Error' || sub.verdict === 'Compilation Error') {
                            verdictColor = 'text-rose-300 bg-rose-950/25 border-rose-900/30';
                          }

                          return (
                            <div key={sub.id} className="rounded-2xl border border-white/10 bg-slate-950/35 overflow-hidden transition-all duration-200">
                              <div
                                onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition select-none"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verdictColor}`}>
                                    {sub.verdict}
                                  </span>
                                  <span className="text-xs text-slate-400 font-semibold">{langLabel}</span>
                                  <span className="text-xs text-slate-500 font-mono">Passed: {sub.passed_count}/{sub.total_count}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 font-mono">{formattedTime}</span>
                                  <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-white/5 p-4 bg-slate-950/80 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Submitted Code</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCode(sub.code);
                                        setIsDirty(true);
                                      }}
                                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/15 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 hover:border-transparent transition"
                                    >
                                      Load into Editor
                                    </button>
                                  </div>
                                  <div className="h-[250px] border border-white/10 rounded-xl overflow-hidden bg-slate-900">
                                    <MonacoEditor
                                      value={sub.code}
                                      language={LANGUAGE_OPTIONS.find(l => l.judge0LanguageId === sub.language_id)?.monacoLanguage || 'cpp'}
                                      readOnly={true}
                                      height="100%"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-400">
                        You have not submitted any solutions for this problem yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                    Select a problem to start coding.
                  </div>
                )}
              </div>
            </aside>
          </div>

            <div className="flex flex-col gap-2 h-full overflow-hidden">
              <section className="glass-panel flex flex-col overflow-hidden rounded-xl shadow-glow border border-white/10 bg-slate-950/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5 bg-slate-950/20">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      <span className="text-slate-500">Language</span>
                      <select
                        value={selectedLanguageKey}
                        onChange={(event) => handleLanguageChange(event.target.value)}
                        className="bg-transparent text-slate-100 outline-none cursor-pointer"
                      >
                        {LANGUAGE_OPTIONS.map((language) => (
                          <option key={language.key} value={language.key} className="bg-slate-950 text-slate-100">
                            {language.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveCode}
                      disabled={!isDirty || !selectedProblemId}
                      className="rounded-full bg-cyan-400/15 border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isDirty ? '● Save Draft' : '✓ Saved'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRunCode}
                      disabled={runningCode || submittingCode || !selectedProblemId}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {runningCode ? 'Running...' : 'Run'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitCode}
                      disabled={runningCode || submittingCode || !selectedProblemId}
                      className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingCode ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>

                <div className="h-[320px] p-1 bg-slate-950/20">
                  <MonacoEditor
                    value={code}
                    onChange={handleCodeChange}
                    language={selectedLanguage.monacoLanguage}
                    height="100%"
                    className="h-full"
                  />
                </div>
              </section>

              <section className="glass-panel flex-1 flex flex-col overflow-hidden rounded-xl shadow-glow border border-white/10 bg-slate-950/40">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 bg-slate-950/20">
                  {renderTabButton('Testcase', activeBottomTab === 'testcase', () => setActiveBottomTab('testcase'))}
                  {renderTabButton('Test Result', activeBottomTab === 'result', () => setActiveBottomTab('result'))}
                </div>

                <div className="p-3 flex-1 overflow-y-auto scrollbar-thin">
                  {activeBottomTab === 'testcase' ? (
                    activeTestcase ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Input</p>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm text-slate-100 scrollbar-thin">
                            {activeTestcase.input_data || '-'}
                          </pre>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Expected Output</p>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm text-slate-100 scrollbar-thin">
                            {activeTestcase.expected_output || '-'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-300">
                        Pick a problem testcase to preview it here.
                      </div>
                    )
                  ) : (
                    <div>
                      <ResultPanel result={activeResult} loading={runningCode || submittingCode} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </div>

      {/* UNSAVED CHANGES MODAL */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-glow backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <span className="text-3xl select-none">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-white">Unsaved Changes</h3>
                <p className="text-xs text-slate-400 mt-0.5">You have unsaved changes in your code editor.</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              Do you want to save your work before leaving? If you exit without saving, you will lose your latest changes.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const userId = localStorage.getItem('demo_active_user_id') || 0;
                  const draftKey = `code_draft_${userId}_${selectedProblemId}_${selectedLanguageKey}`;
                  localStorage.setItem(draftKey, code);
                  setIsDirty(false);
                  setShowUnsavedModal(false);
                  
                  if (pendingNavigation.type === 'url') {
                    navigate(pendingNavigation.target);
                  } else if (pendingNavigation.type === 'problem') {
                    if (contestId) {
                      navigate(`/user/problems/${pendingNavigation.target}?contestId=${contestId}`);
                    } else {
                      navigate(`/user/problems/${pendingNavigation.target}`);
                    }
                    setRunResult(null);
                    setSubmitResult(null);
                    setActiveTestcaseIndex(0);
                    setActiveBottomTab('result');
                  }
                  setPendingNavigation(null);
                }}
                className="w-full rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
              >
                Save & Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  setShowUnsavedModal(false);
                  
                  if (pendingNavigation.type === 'url') {
                    navigate(pendingNavigation.target);
                  } else if (pendingNavigation.type === 'problem') {
                    if (contestId) {
                      navigate(`/user/problems/${pendingNavigation.target}?contestId=${contestId}`);
                    } else {
                      navigate(`/user/problems/${pendingNavigation.target}`);
                    }
                    setRunResult(null);
                    setSubmitResult(null);
                    setActiveTestcaseIndex(0);
                    setActiveBottomTab('result');
                  }
                  setPendingNavigation(null);
                }}
                className="w-full rounded-2xl bg-rose-500/10 border border-rose-500/20 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/25 transition"
              >
                Discard & Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  setPendingNavigation(null);
                }}
                className="w-full rounded-2xl bg-white/5 border border-white/10 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

export default UserWorkspace;
