'use client';

import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useConfigContext } from '../../contexts/ConfigContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Globe, LogOut, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, logout } = useAuth();
  const { config } = useConfigContext();
  const { t, locale, setLocale, availableLocales } = useTranslation();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-700/60 bg-slate-900/80 px-5 backdrop-blur-sm">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
          {config?.app.name ?? 'AppGen'}
        </span>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Language switcher */}
        {availableLocales.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="bg-transparent text-xs text-slate-400 hover:text-white focus:outline-none cursor-pointer"
            >
              {availableLocales.map((l) => (
                <option key={l} value={l} className="bg-slate-900">{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{user.email}</span>
            <button
              onClick={() => void handleLogout()}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title={t('signOut')}
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('signOut')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
