'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { useConfigContext } from '../../../../contexts/ConfigContext';
import { useNotifications } from '../../../../hooks/useNotifications';
import { Navbar } from '../../../../components/layout/Navbar';
import { Sidebar } from '../../../../components/layout/Sidebar';
import { DynamicView } from '../../../../components/dynamic/DynamicView';
import { CardSkeleton } from '../../../../components/ui/LoadingSkeleton';
import { AlertTriangle } from 'lucide-react';
import { getEntity, getView } from '../../../../lib/configEngine';

export default function ViewPage() {
  const params = useParams<{ entity: string; viewType: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useConfigContext();
  const router = useRouter();

  useNotifications();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  if (configLoading) {
    return (
      <div className="flex h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-6"><CardSkeleton /></main>
        </div>
      </div>
    );
  }

  // ── Config validation ──────────────────────────────────────────────────────
  const entity = config ? getEntity(config, params.entity) : undefined;
  const view = config ? getView(config, params.entity, params.viewType) : undefined;

  // Entity not found in config — graceful error, not a crash
  if (!entity) {
    return (
      <div className="flex h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
              <h2 className="text-lg font-semibold text-white">Entity not found</h2>
              <p className="text-sm text-slate-400">
                <code className="font-mono text-amber-300">{params.entity}</code> is not defined in the current config.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // View type unknown — DynamicView/FallbackComponent handles this, but provide a view definition
  const resolvedView = view ?? {
    entity: params.entity,
    type: params.viewType,
    label: `${params.viewType} — ${entity.label ?? entity.name}`,
  };

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl animate-fade-in">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white">{resolvedView.label}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {entity.description ?? entity.label ?? entity.name}
              </p>
            </div>
            {/* DynamicView resolves component from registry — FallbackComponent for unknown types */}
            <DynamicView view={resolvedView} entity={entity} />
          </div>
        </main>
      </div>
    </div>
  );
}
