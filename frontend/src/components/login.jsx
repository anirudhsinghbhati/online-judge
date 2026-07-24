import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

const provider = new GoogleAuthProvider();
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

export default function Login() {
  const navigate = useNavigate();

  // Tab control: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState('signin');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // If user is already logged in, redirect them
    const activeUserId = localStorage.getItem('demo_active_user_id');
    const activeUserRole = localStorage.getItem('demo_active_user_role');
    if (activeUserId && activeUserRole) {
      if (activeUserRole === 'Admin' || activeUserRole === 'Moderator') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    }
  }, [navigate]);

  // Handle errors from Firebase / local API
  const getFriendlyError = (errCode, fallback) => {
    switch (errCode) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'The password must be at least 6 characters.';
      default:
        return fallback;
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser.email) {
        throw new Error('Google account is missing an email address.');
      }

      // Sync user profile to backend database
      const usersList = await requestJson('/api/admin/users');
      let dbUser = usersList.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());

      if (!dbUser) {
        const isAdminEmail = googleUser.email.toLowerCase() === 'bhatianirudhsingh592@gmail.com';
        dbUser = await requestJson('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            name: googleUser.displayName || 'Google User',
            email: googleUser.email,
            role: isAdminEmail ? 'Admin' : 'Contestant'
          })
        });
      } else {
        const isAdminEmail = googleUser.email.toLowerCase() === 'bhatianirudhsingh592@gmail.com';
        if (isAdminEmail && dbUser.role !== 'Admin') {
          dbUser = await requestJson(`/api/admin/users/${dbUser.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...dbUser,
              role: 'Admin'
            })
          });
        }
      }

      // Save user details locally
      localStorage.setItem('demo_active_user_id', dbUser.id);
      localStorage.setItem('demo_active_user_name', dbUser.name);
      localStorage.setItem('demo_active_user_role', dbUser.role);

      window.dispatchEvent(new Event('storage'));

      if (dbUser.role === 'Admin' || dbUser.role === 'Moderator') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err) {
      console.error(err);
      setError(getFriendlyError(err.code, err.message || 'Google Auth failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validations
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (activeTab === 'signup') {
      if (!name) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (activeTab === 'signup') {
        // 1. Firebase Auth Registration
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // 2. Set profile display name in Firebase
        await updateProfile(result.user, { displayName: name });

        // 3. Register user profile in local DB
        const isAdminEmail = email.toLowerCase() === 'bhatianirudhsingh592@gmail.com';
        const dbUser = await requestJson('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            role: isAdminEmail ? 'Admin' : 'Contestant'
          })
        });

        // 4. Save session and auto-login
        localStorage.setItem('demo_active_user_id', dbUser.id);
        localStorage.setItem('demo_active_user_name', dbUser.name);
        localStorage.setItem('demo_active_user_role', dbUser.role);

        window.dispatchEvent(new Event('storage'));
        setSuccessMsg('Account created successfully! Redirecting...');

        setTimeout(() => {
          navigate('/user');
        }, 1200);

      } else {
        // Firebase Auth Sign In
        const result = await signInWithEmailAndPassword(auth, email, password);

        // Lookup profile in DB
        const usersList = await requestJson('/api/admin/users');
        let dbUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());

        // Auto-register in DB if missing (safety check)
        if (!dbUser) {
          const isAdminEmail = email.toLowerCase() === 'bhatianirudhsingh592@gmail.com';
          dbUser = await requestJson('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify({
              name: result.user.displayName || email.split('@')[0],
              email,
              role: isAdminEmail ? 'Admin' : 'Contestant'
            })
          });
        } else {
          const isAdminEmail = email.toLowerCase() === 'bhatianirudhsingh592@gmail.com';
          if (isAdminEmail && dbUser.role !== 'Admin') {
            dbUser = await requestJson(`/api/admin/users/${dbUser.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                ...dbUser,
                role: 'Admin'
              })
            });
          }
        }

        // Save session
        localStorage.setItem('demo_active_user_id', dbUser.id);
        localStorage.setItem('demo_active_user_name', dbUser.name);
        localStorage.setItem('demo_active_user_role', dbUser.role);

        window.dispatchEvent(new Event('storage'));
        setSuccessMsg('Login successful! Redirecting...');

        setTimeout(() => {
          if (dbUser.role === 'Admin' || dbUser.role === 'Moderator') {
            navigate('/admin');
          } else {
            navigate('/user');
          }
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setError(getFriendlyError(err.code, err.message || 'Authentication failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(148,163,184,0.08),rgba(255,255,255,0))] text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      {/* Branding */}
      <div className="absolute top-10 flex items-center gap-2 group select-none">
        <span className="h-3.5 w-3.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
        <span className="font-black text-2xl tracking-widest text-white uppercase group-hover:text-cyan-300 transition">
          Code Runner
        </span>
      </div>

      {/* Main glassmorphic wrapper */}
      <div className="glass-panel max-w-md w-full rounded-[32px] border border-white/10 bg-slate-950/65 p-8 shadow-glow backdrop-blur-2xl mt-12 animate-fade-in relative overflow-hidden">

        {/* Decorative background glow elements */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Tab switch buttons */}
        <div className="flex border-b border-white/5 mb-8 relative z-10">
          <button
            onClick={() => {
              setActiveTab('signin');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 pb-4 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'signin' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            Sign In
            {activeTab === 'signin' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 pb-4 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'signup' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            Register
            {activeTab === 'signup' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-300 font-medium text-center relative z-10 animate-shake">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300 font-medium text-center relative z-10">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
          {activeTab === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all duration-200 text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-11 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all duration-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {activeTab === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all duration-200 text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold tracking-wide active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            {loading && !showPassword ? (
              <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 relative z-10 flex items-center justify-center">
          <span className="absolute w-full h-[1px] bg-white/5" />
          <span className="relative px-3 text-[10px] uppercase font-bold text-slate-500 bg-[#091021]">Or continue with</span>
        </div>

        {/* Google OAuth alternative */}
        <div className="relative z-10">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-400/30 active:scale-[0.98] transition-all duration-200 group disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading && showPassword ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            ) : (
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.43c0,-0.64 -0.06,-1.25 -0.17,-1.85z" fill="#4285F4" />
                  <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.58c-0.9,0.6 -2.07,0.97 -3.66,0.97c-2.81,0 -5.2,-1.9 -6.05,-4.45H1.54v2.67c1.49,2.97 4.57,5.01 8.16,5.01z" fill="#34A853" />
                  <path d="M5.95,12.37c-0.22,-0.66 -0.35,-1.37 -0.35,-2.1c0,-0.73 0.13,-1.44 0.35,-2.1V5.5H1.54C0.77,7.02 0.33,8.74 0.33,10.27c0,1.53 0.44,3.25 1.21,4.77l4.41,-3.67z" fill="#FBBC05" />
                  <path d="M12,4.88c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,2.15 14.42,1.38 12,1.38C8.43,1.38 5.35,3.42 3.86,6.39l4.41,3.67c0.85,-2.55 3.24,-4.45 6.05,-4.45z" fill="#EA4335" />
                </g>
              </svg>
            )}
            <span className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Google Account
            </span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 border-t border-white/5 pt-4 text-center relative z-10">
          <p className="text-[10px] text-slate-500 leading-normal">
            By signing in, you agree to Code Runner's terms of use. Credentials are securely authenticated via Firebase Authentication.
          </p>
        </div>
      </div>
    </div>
  );
}