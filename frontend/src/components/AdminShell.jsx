import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.01a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.01a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.34-1.87l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.01a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.87-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.38.58.96.95 1.6 1H21a2 2 0 1 1 0 4h-.01a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

const sidebarLinks = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  },
  {
    label: 'Users',
    to: '/admin/user-management',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    label: 'Problems',
    to: '/admin/problem-management',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 18l6-6-6-6M8 6L2 12l6 6" />
      </svg>
    )
  },
  {
    label: 'Contests',
    to: '/admin/contest-management',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
        <path d="M12 2a4 4 0 0 1 4 4v7.3a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a4 4 0 0 1 4-4z" />
      </svg>
    )
  },
  {
    label: 'Logs',
    to: '/admin/logs',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M5 20v-4" />
        <path d="M9 20v-8" />
        <path d="M13 20V8" />
        <path d="M17 20V4" />
      </svg>
    )
  },
  {
    label: 'Notices',
    to: '/admin/notices',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    )
  }
];

export default function AdminShell({ breadcrumb, toolbar, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);

  // Load user list for simulation switcher
  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const data = await requestJson('/api/admin/users');
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setAllUsers(list);

          const savedId = localStorage.getItem('demo_active_user_id');
          setActiveUserId(savedId ? Number(savedId) : null);
        }
      } catch (err) {
        console.error('Failed to load users in admin shell:', err);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleUserChange(userId) {
    const selected = allUsers.find((u) => u.id === userId);
    if (selected) {
      setActiveUserId(selected.id);
      localStorage.setItem('demo_active_user_id', selected.id);
      localStorage.setItem('demo_active_user_name', selected.name);
      localStorage.setItem('demo_active_user_role', selected.role);
      
      // Dispatch storage event to notify other tabs
      window.dispatchEvent(new Event('storage'));
      
      // If we switched to a non-admin role, redirect to user dashboard
      if (selected.role !== 'Admin' && selected.role !== 'Moderator') {
        navigate('/user');
      } else {
        window.location.reload();
      }
    }
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function isTabActive(item) {
    if (item.to === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(item.to);
  }

  return (
    <div className="min-h-screen w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* DESKTOP SIDE BAR NAVIGATION */}
        <aside className="hidden lg:flex w-full lg:w-64 shrink-0 rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur-xl flex-col justify-between self-start">
          <div className="space-y-6">
            <div className="px-3 py-2 flex items-center gap-3 border-b border-white/5 pb-4">
              <span className="h-3 w-3 rounded-full bg-cyan-300 animate-pulse" />
              <span className="font-bold text-sm tracking-wider uppercase text-white">Console Admin</span>
            </div>

            <nav className="space-y-1">
              {sidebarLinks.map((link) => {
                const active = isTabActive(link);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                      active
                        ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 border-t border-white/5 pt-4 text-center">
            <Link to="/user" className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-300 transition">
              &larr; Exit Console
            </Link>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWER OVERLAY */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
            <aside className="relative w-72 max-w-xs bg-slate-950 border-r border-white/10 p-5 flex flex-col justify-between h-full animate-slide-in">
              <div className="space-y-6">
                <div className="px-3 py-2 flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-cyan-300 animate-pulse" />
                    <span className="font-bold text-sm tracking-wider uppercase text-white">Console Admin</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    aria-label="Close sidebar"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <nav className="space-y-1">
                  {sidebarLinks.map((link) => {
                    const active = isTabActive(link);
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                          active
                            ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-8 border-t border-white/5 pt-4 text-center">
                <Link to="/user" className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-300 transition">
                  &larr; Exit Console
                </Link>
              </div>
            </aside>
            <div className="flex-1" onClick={() => setIsSidebarOpen(false)} />
          </div>
        )}

        {/* MAIN BODY WINDOW */}
        <div className="flex-1 rounded-[28px] border border-white/10 bg-slate-950/70 shadow-glow backdrop-blur-xl flex flex-col overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
              
              {/* MOBILE MENU TRIGGER BUTTON (THREE LINES) */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                aria-label="Open sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {breadcrumb.map((item, index) => (
                <span key={item.label} className="flex items-center gap-2">
                  {item.to ? (
                    <Link
                      to={item.to}
                      className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 transition hover:border-cyan-300/30 hover:bg-white/10"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-300 px-2">{item.label}</span>
                  )}
                  {index < breadcrumb.length - 1 ? <span className="text-slate-500 font-mono">&gt;</span> : null}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* User simulator profile switcher (strictly in Admin Panel) */}
              {allUsers.length > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                  <span className="text-slate-500 hidden sm:inline">Simulate Session:</span>
                  <select
                    value={activeUserId || ''}
                    onChange={(e) => handleUserChange(Number(e.target.value))}
                    className="bg-transparent text-slate-100 outline-none font-bold cursor-pointer"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-950 text-slate-100">
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Link to User View */}
              <Link
                to="/user"
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
              >
                <span>&larr;</span> User View
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                  aria-label="Profile"
                >
                  <ProfileIcon />
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                  aria-label="Settings"
                >
                  <SettingsIcon />
                </button>
              </div>
            </div>
          </header>

          {toolbar && <div className="px-4 py-4 sm:px-6 border-b border-white/5">{toolbar}</div>}
          <main className="px-4 py-5 sm:px-6 sm:py-6 flex-1 flex flex-col">{children}</main>
        </div>

      </div>
    </div>
  );

}