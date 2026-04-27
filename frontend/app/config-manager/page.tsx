'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useConfigContext } from '../../contexts/ConfigContext';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { api, ApiClientError } from '../../lib/api';
import { Save, RefreshCw, Upload, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ConfigUploadResponse {
  meta: { valid: boolean; validationErrors: string[]; message?: string };
}

export default function ConfigManagerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { config, reload } = useConfigContext();
  const router = useRouter();

  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load current config into editor on mount
  useEffect(() => {
    if (config) {
      setJsonText(JSON.stringify(config, null, 2));
    }
  }, [config]);

  const handleTextChange = (value: string) => {
    setJsonText(value);
    setParseError(null);
    setValidationErrors([]);

    // Live JSON parse check
    try {
      JSON.parse(value);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsSaving(true);
      setValidationErrors([]);

      const res = await api.post<ConfigUploadResponse>('/config', parsed);
      const meta = (res as unknown as { meta: ConfigUploadResponse['meta'] }).meta;

      if (meta.validationErrors?.length > 0) {
        setValidationErrors(meta.validationErrors);
        toast.success('Config saved with warnings — system is still running', { duration: 5000 });
      } else {
        toast.success('Config saved and applied!');
      }

      await reload();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setParseError((err as SyntaxError).message);
      } else if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to save config');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await api.post('/config/reload');
      await reload();
      if (config) setJsonText(JSON.stringify(config, null, 2));
      toast.success('Config reloaded from disk');
    } catch (err) {
      toast.error('Reload failed');
    } finally {
      setIsReloading(false);
    }
  };

  const loadSampleConfig = () => {
    const sample = {
      app: { name: 'My Custom App', language: 'en', description: 'Built from config', theme: 'dark' },
      entities: [
        {
          name: 'customers',
          label: 'Customers',
          fields: [
            { name: 'name', type: 'string', label: 'Name', required: true },
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'tier', type: 'enum', label: 'Tier', options: ['free', 'pro', 'enterprise'] },
          ],
        },
      ],
      views: [
        { entity: 'customers', type: 'table', label: 'All Customers', columns: ['name', 'email', 'tier'] },
        { entity: 'customers', type: 'form', label: 'New Customer' },
        { entity: 'customers', type: 'dashboard', label: 'Overview' },
      ],
      labels: {
        en: { save: 'Save', cancel: 'Cancel', create: 'Add Customer' },
      },
      events: [{ trigger: 'record.created', action: 'toast', message: 'Customer added!' }],
    };
    setJsonText(JSON.stringify(sample, null, 2));
    setParseError(null);
    setValidationErrors([]);
  };

  const isValidJson = parseError === null && jsonText.length > 0;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Config Manager</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Edit and apply your JSON config live. Changes take effect immediately.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCurrent((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {showCurrent ? 'Hide' : 'View Current'}
                </button>
                <button
                  onClick={loadSampleConfig}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Load Sample
                </button>
                <button
                  onClick={() => void handleReload()}
                  disabled={isReloading}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={clsx('h-4 w-4', isReloading && 'animate-spin')} />
                  Reload from Disk
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={!isValidJson || isSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Applying...' : 'Apply Config'}
                </button>
              </div>
            </div>

            {/* Current config summary */}
            {showCurrent && config && (
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 grid grid-cols-4 gap-4">
                {[
                  { label: 'App', value: config.app.name },
                  { label: 'Entities', value: config.entities.length },
                  { label: 'Views', value: config.views.length },
                  { label: 'Languages', value: Object.keys(config.labels).join(', ') || 'none' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className="text-sm font-medium text-white mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* JSON Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">JSON Configuration</label>
                <div className="flex items-center gap-2">
                  {parseError ? (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle className="h-3 w-3" /> Invalid JSON
                    </span>
                  ) : jsonText.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle className="h-3 w-3" /> Valid JSON
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-600">{jsonText.length} chars</span>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => handleTextChange(e.target.value)}
                spellCheck={false}
                className={clsx(
                  'w-full rounded-xl border bg-slate-900 p-4 font-mono text-sm text-slate-200',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none',
                  'placeholder:text-slate-600 leading-relaxed',
                  parseError ? 'border-red-500' : 'border-slate-700',
                )}
                rows={28}
                placeholder={'{\n  "app": { "name": "My App" },\n  "entities": [],\n  "views": []\n}'}
              />

              {parseError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {parseError}
                </p>
              )}
            </div>

            {/* Validation warnings */}
            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Config applied with {validationErrors.length} warning{validationErrors.length !== 1 ? 's' : ''}:
                </p>
                <ul className="space-y-1">
                  {validationErrors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-300/80 font-mono">• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tips</p>
              <ul className="space-y-1 text-xs text-slate-500">
                <li>• Changes apply immediately — the sidebar and views update automatically.</li>
                <li>• Invalid configs are accepted with warnings — the system heals what it can.</li>
                <li>• Use <code className="font-mono text-slate-400">"type": "dashboard"</code> in views to render a stats overview.</li>
                <li>• Unknown view types show a fallback component — they never crash the app.</li>
                <li>• Add new entities and views without restarting anything.</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
