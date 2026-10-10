import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, LogIn, Database, KeyRound, Info } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Supabase is not properly configured. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.'
      );
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
        } else {
          setErrorMessage(`Authentication Error: ${error.message}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-center">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Supabase Configuration Required</h2>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            The Arogya Pharma AI live data integration requires valid Supabase environment variables in <code className="bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded text-[11px]">.env.local</code>.
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left text-xs font-mono text-slate-300 mb-4 space-y-1">
            <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
            <div>VITE_SUPABASE_PUBLISHABLE_KEY=ey...</div>
          </div>
          <p className="text-[11px] text-slate-500">
            Restart your development server after configuring <code className="text-slate-400">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20 mb-2">
            <ShieldCheck className="w-8 h-8 text-teal-100" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Arogya Pharma AI</h1>
          <p className="text-xs text-teal-400 font-medium tracking-wide">
            Pharmaceutical Batch Risk & Recall Containment Agent
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-400" />
              QA Console Authentication
            </h2>
            <span className="text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full">
              RLS SECURED
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Authorized Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="qa.lead@arogyapharma.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to QA Console</span>
                </>
              )}
            </button>
          </form>

          {/* Guidance box for test user account creation in Supabase Dashboard */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>Configuring Test Accounts in Supabase:</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Create a user in <strong className="text-slate-300">Supabase Auth → Users</strong>, then add your trusted role in User Metadata:
            </p>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[10px] text-slate-300 space-y-0.5">
              <div className="text-slate-500">// app_metadata format in Supabase:</div>
              <div>&#123; &quot;app_role&quot;: &quot;qa_lead&quot; &#125;</div>
              <div className="text-slate-500">// Authorized roles: qa_lead, warehouse_manager, regulatory_officer</div>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Cypher 2026 Hackathon • Arogya Pharma Compliance Engine
        </div>
      </div>
    </div>
  );
};
