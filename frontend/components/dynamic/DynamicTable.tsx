'use client';

import { useState } from 'react';
import { useEntity } from '../../hooks/useEntity';
import { useTranslation } from '../../hooks/useTranslation';
import { useConfigContext } from '../../contexts/ConfigContext';
import { getViewFields, getView } from '../../lib/configEngine';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { DynamicForm } from './DynamicForm';
import type { ViewComponentProps } from '../registry/componentMap';
import type { EntityRecord, FieldDefinition } from '../../types';
import { Edit2, Trash2, Plus, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export function DynamicTable({ view, entity }: ViewComponentProps) {
  const { config } = useConfigContext();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { records, meta, isLoading, error, remove, fetch } = useEntity(entity.name, { page, limit: 20 });
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Determine columns to display from the view config
  const columnFields: FieldDefinition[] = config
    ? getViewFields(config, entity.name, view.type)
    : entity.fields.slice(0, 5);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    setDeleting(id);
    const ok = await remove(id);
    if (ok) toast.success(t('success'));
    setDeleting(null);
  };

  const formView = config
    ? (getView(config, entity.name, 'form') ?? { entity: entity.name, type: 'form' })
    : { entity: entity.name, type: 'form' };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {meta ? `${meta.total} record${meta.total !== 1 ? 's' : ''}` : ''}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/import/${entity.name}`}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {t('import')}
          </Link>
          <button
            onClick={() => { setShowCreate(true); setEditing(null); }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('create')}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-brand-500/30 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('create')} {entity.label ?? entity.name}</h3>
          <DynamicForm
            view={formView as Parameters<typeof DynamicForm>[0]['view']}
            entity={entity}
            onSuccess={() => { setShowCreate(false); void fetch(); }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="rounded-xl border border-amber-500/30 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">{t('edit')} record</h3>
          <DynamicForm
            view={formView as Parameters<typeof DynamicForm>[0]['view']}
            entity={entity}
            initialData={editing.data}
            recordId={editing.id}
            onSuccess={() => { setEditing(null); void fetch(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/50">
        {isLoading && <div className="p-6"><LoadingSkeleton rows={5} cols={columnFields.length + 1} /></div>}

        {error && !isLoading && (
          <div className="p-8 text-center text-sm text-red-400">{error}</div>
        )}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/50">
                  {columnFields.map((f) => (
                    <th key={f.name} className="px-4 py-3 font-medium text-slate-400">
                      {f.label ?? f.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-slate-400">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr
                    key={record.id}
                    className={clsx(
                      'border-b border-slate-700/30 transition-colors hover:bg-slate-700/20',
                      idx % 2 === 0 ? '' : 'bg-slate-800/20',
                    )}
                  >
                    {columnFields.map((f) => (
                      <td key={f.name} className="px-4 py-3 text-slate-200">
                        <CellValue field={f} value={record.data[f.name]} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditing(record); setShowCreate(false); }}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(record.id)}
                          disabled={deleting === record.id}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                          title={t('delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={columnFields.length + 1} className="py-12 text-center text-slate-500">
                      {t('noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-3">
            <span className="text-xs text-slate-500">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cell value renderer ───────────────────────────────────────────────────────

function CellValue({ field, value }: { field: FieldDefinition; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-600">—</span>;
  }

  if (field.type === 'boolean') {
    return (
      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        value ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400',
      )}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (field.type === 'enum') {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-300">
        {String(value)}
      </span>
    );
  }

  if (field.type === 'date') {
    try {
      return <span>{new Date(String(value)).toLocaleDateString()}</span>;
    } catch {
      return <span>{String(value)}</span>;
    }
  }

  const str = String(value);
  return <span title={str}>{str.length > 50 ? str.slice(0, 50) + '…' : str}</span>;
}
