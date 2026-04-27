'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { ApiClientError } from '../../lib/api';
import { Zap, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  /** One-click demo access — logs into or creates a shared demo account */
  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    setError('');
    const DEMO_EMAIL = 'demo@appgen.com';
    const DEMO_PASS = 'demo1234!!';
    const DEMO_NAME = 'Demo User';
    try {
      // First try logging in (account may already exist)
      await login(DEMO_EMAIL, DEMO_PASS);
      router.push('/');
    } catch (loginErr) {
      // Only attempt registration if it's an auth failure (wrong creds / user not found)
      const msg = loginErr instanceof ApiClientError ? loginErr.message.toLowerCase() : '';
      const shouldRegister = msg.includes('invalid') || msg.includes('not found') || msg.includes('credentials');
      if (!shouldRegister) {
        setError(loginErr instanceof ApiClientError ? loginErr.message : 'Demo access failed');
        setIsDemoLoading(false);
        return;
      }
      try {
        await register(DEMO_EMAIL, DEMO_PASS, DEMO_NAME);
        router.push('/');
      } catch (regErr) {
        setError(regErr instanceof ApiClientError ? regErr.message : 'Demo setup failed');
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">to your AppGen workspace</p>
        </div>

        {/* Demo access button */}
        <button
          type="button"
          onClick={() => void handleDemoAccess()}
          disabled={isDemoLoading || isLoading}
          className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-300 hover:bg-brand-500/20 disabled:opacity-50 transition-all"
        >
          {isDemoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-base">⚡</span>
          )}
          {isDemoLoading ? 'Setting up demo...' : 'Try Demo (one click)'}
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-950 px-3 text-xs text-slate-600">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || isDemoLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
