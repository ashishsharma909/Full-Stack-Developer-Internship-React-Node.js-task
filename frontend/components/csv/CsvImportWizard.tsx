'use client';

import { useState, useRef } from 'react';
import { api, ApiClientError } from '../../lib/api';
import type { CsvUploadResponse, CsvImportResult } from '../../types';
import { Upload, ArrowRight, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Step = 'upload' | 'map' | 'confirm' | 'done';

interface CsvImportWizardProps {
  entityName: string;
  entityFields: string[];
  onComplete?: () => void;
}

export function CsvImportWizard({ entityName, entityFields, onComplete }: CsvImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [uploadResult, setUploadResult] = useState<CsvUploadResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1: Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.upload<CsvUploadResponse>(`/import/${entityName}/upload`, fd);
      setUploadResult(result);

      // Auto-map columns that exactly match entity field names
      const autoMap: Record<string, string> = {};
      for (const header of result.headers) {
        const match = entityFields.find((f) => f.toLowerCase() === header.toLowerCase());
        if (match) autoMap[header] = match;
      }
      setMapping(autoMap);
      setStep('map');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Save mapping
  const handleMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadResult) return;

    setIsLoading(true);
    try {
      await api.post(`/import/${entityName}/map`, { importId: uploadResult.importId, mapping });
      setStep('confirm');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Mapping failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Confirm
  const handleConfirm = async () => {
    if (!uploadResult) return;
    setIsLoading(true);
    try {
      const result = await api.post<CsvImportResult>(`/import/${entityName}/confirm`, { importId: uploadResult.importId });
      setImportResult(result);
      setStep('done');
      toast.success(`Imported ${result.imported} record${result.imported !== 1 ? 's' : ''}`);
      onComplete?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  const steps: Step[] = ['upload', 'map', 'confirm', 'done'];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={clsx(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              step === s ? 'bg-brand-600 text-white' :
              steps.indexOf(step) > i ? 'bg-emerald-600 text-white' :
              'bg-slate-700 text-slate-400'
            )}>
              {steps.indexOf(step) > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={clsx('text-sm capitalize', step === s ? 'text-white' : 'text-slate-500')}>
              {s}
            </span>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 py-12 cursor-pointer hover:border-brand-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-slate-500 mb-3" />
            <p className="text-sm text-slate-300">Click to upload a CSV file</p>
            <p className="text-xs text-slate-500 mt-1">Max 10MB</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" required />
          <button type="submit" disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors">
            {isLoading ? 'Uploading...' : 'Upload & Continue'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && uploadResult && (
        <form onSubmit={handleMap} className="space-y-4">
          <p className="text-sm text-slate-400">
            Map CSV columns to <strong className="text-white">{entityName}</strong> fields.
            Leave unmapped to skip that column.
          </p>

          {/* Preview */}
          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900/60">
                  {uploadResult.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-medium text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadResult.preview.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-t border-slate-700/30">
                    {uploadResult.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-slate-300">{row[h] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            {uploadResult.headers.map((header) => (
              <div key={header} className="flex items-center gap-3">
                <span className="w-32 shrink-0 font-mono text-xs text-slate-300">{header}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                <select
                  value={mapping[header] ?? ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— Skip —</option>
                  {entityFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button type="submit" disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors">
            {isLoading ? 'Saving...' : 'Save Mapping & Continue'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && uploadResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 space-y-2">
            <p className="text-sm text-slate-300">Ready to import:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-500">File</span>
              <span className="text-white">{uploadResult.filename}</span>
              <span className="text-slate-500">Total rows</span>
              <span className="text-white">{uploadResult.preview.length}+ rows</span>
              <span className="text-slate-500">Target entity</span>
              <span className="text-white">{entityName}</span>
              <span className="text-slate-500">Mapped columns</span>
              <span className="text-white">{Object.values(mapping).filter(Boolean).length}</span>
            </div>
          </div>
          <button onClick={() => void handleConfirm()} disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {isLoading ? 'Importing...' : 'Confirm Import'}
            <Check className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && importResult && (
        <div className="space-y-4 text-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mx-auto">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{importResult.imported} records imported</p>
            {importResult.failed > 0 && (
              <p className="text-sm text-amber-400 mt-1 flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {importResult.failed} rows failed
              </p>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div className="text-left rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-1">
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-slate-400">Row {e.row}: {e.reason}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
