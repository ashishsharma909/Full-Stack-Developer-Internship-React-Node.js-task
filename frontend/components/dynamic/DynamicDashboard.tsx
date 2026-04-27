'use client';

import { useEffect, useState } from 'react';
import { useEntity } from '../../hooks/useEntity';
import { useTranslation } from '../../hooks/useTranslation';
import type { ViewComponentProps } from '../registry/componentMap';
import { Database, TrendingUp, Clock, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

/**
 * DynamicDashboard — a summary view for an entity.
 * Shows total count, recent records, and field-level stats.
 * Registered as "dashboard" view type in componentMap.
 */
export function DynamicDashboard({ view, entity }: ViewComponentProps) {
  const { t } = useTranslation();
  const { records, meta, isLoading, error } = useEntity(entity.name, { limit: 5 });

  // Calculate simple stats from the most recent records
  const enumFields = entity.fields.filter((f) => f.type === 'enum' && f.options?.length);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Total ${entity.label ?? entity.name}`}
          value={isLoading ? '…' : String(meta?.total ?? records.length)}
          icon={Database}
          color="brand"
        />
        <StatCard
          label="This page"
          value={isLoading ? '…' : String(records.length)}
          icon={BarChart2}
          color="emerald"
        />
        <StatCard
          label="Fields defined"
          value={String(entity.fields.length)}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Enum field breakdowns */}
      {enumFields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {enumFields.slice(0, 2).map((field) => {
            const counts: Record<string, number> = {};
            for (const opt of field.options ?? []) counts[opt] = 0;
            for (const record of records) {
              const v = String(record.data[field.name] ?? '');
              if (v in counts) counts[v]++;
            }
            const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

            return (
              <div key={field.name} className="card space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {field.label ?? field.name} breakdown
                </p>
                <div className="space-y-2">
                  {Object.entries(counts).map(([opt, count]) => (
                    <div key={opt}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{opt}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700">
                        <div
                          className="h-1.5 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent records */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Recent {entity.label ?? entity.name}
          </p>
          <Link
            href={`/view/${entity.name}/table`}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all →
          </Link>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!isLoading && records.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">{t('noData')}</p>
        )}

        <div className="space-y-2">
          {records.slice(0, 5).map((record) => {
            // Find the first string-like field for display
            const primaryField = entity.fields.find((f) =>
              ['string', 'email', 'text'].includes(f.type),
            );
            const secondaryField = entity.fields.find(
              (f) => f !== primaryField && ['string', 'email', 'enum'].includes(f.type),
            );

            const primary = primaryField ? String(record.data[primaryField.name] ?? '—') : record.id.slice(0, 8);
            const secondary = secondaryField ? String(record.data[secondaryField.name] ?? '') : '';

            return (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-white">{primary}</p>
                  {secondary && <p className="text-xs text-slate-500">{secondary}</p>}
                </div>
                <time className="text-xs text-slate-600">
                  {new Date(record.createdAt).toLocaleDateString()}
                </time>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  brand: 'bg-brand-500/10 text-brand-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: keyof typeof COLOR_MAP;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', COLOR_MAP[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
