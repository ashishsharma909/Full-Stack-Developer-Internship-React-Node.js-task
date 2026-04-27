'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useConfigContext } from '../contexts/ConfigContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../hooks/useNotifications';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { Table2, FileText, Upload, Database, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const VIEW_ICONS = {
  table: Table2,
  form: FileText,
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useConfigContext();
  const { t } = useTranslation();
  const router = useRouter();

  // Activate SSE notifications for this user
  useNotifications();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {t('welcome')}, {user.name ?? user.email.split('@')[0]} 👋
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {config?.app.description || `${config?.app.name ?? 'App'} is running from your JSON config.`}
              </p>
            </div>

            {/* Stats bar */}
            {!configLoading && config && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Entities', value: config.entities.length, icon: Database },
                  { label: 'Views', value: config.views.length, icon: Table2 },
                  { label: 'Languages', value: Object.keys(config.labels).length, icon: FileText },
                ].map((stat) => (
                  <div key={stat.label} className="card flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
                      <stat.icon className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Views grid */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Views
              </h2>
              {configLoading && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
                </div>
              )}
              {!configLoading && config && config.views.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {config.views.map((view) => {
                    const entity = config.entities.find((e) => e.name === view.entity);
                    const Icon = VIEW_ICONS[view.type as keyof typeof VIEW_ICONS] ?? FileText;
                    return (
                      <Link
                        key={`${view.entity}-${view.type}`}
                        href={`/view/${view.entity}/${view.type}`}
                        className="group card flex flex-col gap-3 hover:border-brand-500/50 hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
                            <Icon className="h-4.5 w-4.5 text-brand-400" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-brand-400 transition-colors" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{view.label ?? `${entity?.label ?? view.entity} ${view.type}`}</p>
                          <p className="mt-0.5 text-xs text-slate-500 capitalize">{view.type} · {entity?.label ?? view.entity}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              {!configLoading && config && config.views.length === 0 && (
                <div className="card text-center py-12">
                  <p className="text-slate-500 text-sm">No views configured. Add views to your JSON config to get started.</p>
                </div>
              )}
            </div>

            {/* Entities + Import quick access */}
            {!configLoading && config && config.entities.length > 0 && (
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Import CSV
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {config.entities.map((entity) => (
                    <Link
                      key={entity.name}
                      href={`/import/${entity.name}`}
                      className="group flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 px-4 py-3 hover:border-slate-600 hover:bg-slate-800 transition-all"
                    >
                      <Upload className="h-4 w-4 text-slate-500 group-hover:text-brand-400 transition-colors" />
                      <span className="text-sm text-slate-300">{entity.label ?? entity.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
