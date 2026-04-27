'use client';

import { useState } from 'react';
import { useEntity } from '../../hooks/useEntity';
import { useTranslation } from '../../hooks/useTranslation';
import { getViewFields } from '../../lib/configEngine';
import { useConfigContext } from '../../contexts/ConfigContext';
import { FormSkeleton } from '../ui/LoadingSkeleton';
import type { ViewComponentProps } from '../registry/componentMap';
import type { FieldDefinition } from '../../types';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface DynamicFormProps extends ViewComponentProps {
  initialData?: Record<string, unknown>;
  recordId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DynamicForm({ view, entity, initialData, recordId, onSuccess, onCancel }: DynamicFormProps) {
  const { config } = useConfigContext();
  const { t } = useTranslation();
  const { create, update, isLoading } = useEntity(entity.name, { autoFetch: false });

  const fields = config ? getViewFields(config, entity.name, view.type) : entity.fields;

  // Initialize form state from initialData or field defaults
  const initState = () => {
    const s: Record<string, unknown> = {};
    for (const f of fields) {
      s[f.name] = initialData?.[f.name] ?? f.defaultValue ?? '';
    }
    return s;
  };

  const [values, setValues] = useState<Record<string, unknown>>(initState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const val = values[f.name];
      if (f.required && (val === '' || val === null || val === undefined)) {
        errs[f.name] = t('required');
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Strip empty strings for optional fields
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== '' && v !== null) payload[k] = v;
      }

      const result = recordId
        ? await update(recordId, payload)
        : await create(payload);

      if (result) {
        toast.success(recordId ? t('success') + ' — updated' : t('success') + ' — created');
        onSuccess?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  if (isLoading && !initialData) {
    return <FormSkeleton fields={fields.length} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up" noValidate>
      {fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={values[field.name]}
          error={errors[field.name]}
          onChange={(v) => setValue(field.name, v)}
        />
      ))}

      {fields.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-8">
          This entity has no fields defined in the config.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {submitting ? t('loading') : t('save')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

// ── Field input renderer ─────────────────────────────────────────────────────

interface FieldInputProps {
  field: FieldDefinition;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

function FieldInput({ field, value, error, onChange }: FieldInputProps) {
  const label = field.label ?? field.name;
  const inputClass = clsx(
    'w-full rounded-lg border bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-brand-500',
    error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600',
  );

  const renderInput = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              id={`field-${field.name}`}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-300">{label}</span>
          </label>
        );

      case 'enum':
        return (
          <select
            id={`field-${field.name}`}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={clsx(inputClass, 'cursor-pointer')}
          >
            <option value="">Select {label}</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'text':
        return (
          <textarea
            id={`field-${field.name}`}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={clsx(inputClass, 'resize-y')}
          />
        );

      case 'number':
        return (
          <input
            id={`field-${field.name}`}
            type="number"
            value={value === '' || value === undefined ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
            className={inputClass}
          />
        );

      case 'date':
        return (
          <input
            id={`field-${field.name}`}
            type="date"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        );

      default:
        // string, email, url — use <input type="...">
        return (
          <input
            id={`field-${field.name}`}
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={inputClass}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      {field.type !== 'boolean' && (
        <label htmlFor={`field-${field.name}`} className="block text-sm font-medium text-slate-300">
          {label}
          {field.required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
