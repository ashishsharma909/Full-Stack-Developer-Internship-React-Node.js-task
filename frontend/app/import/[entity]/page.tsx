'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfigContext } from '../../../contexts/ConfigContext';
import { Navbar } from '../../../components/layout/Navbar';
import { Sidebar } from '../../../components/layout/Sidebar';
import { CsvImportWizard } from '../../../components/csv/CsvImportWizard';
import { CardSkeleton } from '../../../components/ui/LoadingSkeleton';
import { AlertTriangle } from 'lucide-react';
import { getEntity } from '../../../lib/configEngine';

export default function ImportPage() {
  const params = useParams<{ entity: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useConfigContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const entity = config ? getEntity(config, params.entity) : undefined;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl animate-fade-in">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white">Import CSV</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload a CSV file and map its columns to{' '}
                <span className="text-brand-400">{entity?.label ?? params.entity}</span> fields.
              </p>
            </div>

            {configLoading && <CardSkeleton />}

            {!configLoading && !entity && (
              <div className="card flex items-center gap-3 text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm">Entity <code className="font-mono">{params.entity}</code> not found in config.</p>
              </div>
            )}

            {!configLoading && entity && (
              <div className="card">
                <CsvImportWizard
                  entityName={entity.name}
                  entityFields={entity.fields.map((f) => f.name)}
                  onComplete={() => router.push(`/view/${entity.name}/table`)}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
