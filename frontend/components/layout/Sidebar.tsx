'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConfigContext } from '../../contexts/ConfigContext';
import { CardSkeleton } from '../ui/LoadingSkeleton';
import { Table2, FileText, Database, ChevronRight, LayoutDashboard, Settings, X, Menu } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

const VIEW_ICONS: Record<string, React.ReactNode> = {
  table: <Table2 className="h-4 w-4" />,
  form: <FileText className="h-4 w-4" />,
  dashboard: <LayoutDashboard className="h-4 w-4" />,
};

export function Sidebar() {
  const { config, isLoading } = useConfigContext();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const grouped = config
    ? config.entities.reduce<Record<string, typeof config.views>>((acc, entity) => {
        acc[entity.name] = config.views.filter((v) => v.entity === entity.name);
        return acc;
      }, {})
    : {};

  const navLink = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      href={href}
      onClick={() => setMobileOpen(false)}
      className={clsx(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        pathname === href
          ? 'bg-brand-500/15 text-brand-300'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white',
      )}
    >
      {icon}
      {label}
    </Link>
  );

  const sidebarContent = (
    <nav className="p-3 space-y-1">
      {navLink('/', <Database className="h-4 w-4" />, 'Dashboard')}
      {navLink('/config-manager', <Settings className="h-4 w-4" />, 'Config Manager')}

      <div className="my-2 border-t border-slate-800" />

      {isLoading && (
        <div className="px-1 space-y-2 pt-2"><CardSkeleton /></div>
      )}

      {!isLoading && config && Object.entries(grouped).map(([entityName, views]) => {
        const entity = config.entities.find((e) => e.name === entityName);
        return (
          <div key={entityName} className="pt-1">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {entity?.label ?? entityName}
            </p>

            {views.map((view) => {
              const href = `/view/${view.entity}/${view.type}`;
              return (
                <Link
                  key={`${view.entity}-${view.type}`}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    pathname === href
                      ? 'bg-brand-500/15 text-brand-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  {VIEW_ICONS[view.type] ?? <ChevronRight className="h-4 w-4" />}
                  <span className="flex-1 truncate">{view.label ?? `${view.type} — ${view.entity}`}</span>
                </Link>
              );
            })}

            <Link
              href={`/import/${entityName}`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <span className="text-xs">↑</span>
              Import {entity?.label ?? entityName}
            </Link>
          </div>
        );
      })}

      {!isLoading && config && config.entities.length === 0 && (
        <p className="px-3 py-4 text-xs text-slate-600">
          No entities.{' '}
          <Link href="/config-manager" className="text-brand-400 hover:underline">
            Open Config Manager →
          </Link>
        </p>
      )}
    </nav>
  );

  return (
    <>
      {/* Mobile FAB toggle */}
      <button
        aria-label="Toggle navigation"
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 shadow-lg md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-40 h-full w-64 overflow-y-auto border-r border-slate-700/60 bg-slate-900 transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center px-4 border-b border-slate-700/60">
          <span className="text-sm font-semibold text-white">Navigation</span>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-700/60 bg-slate-900">
        {sidebarContent}
      </aside>
    </>
  );
}
