import { AlertTriangle } from 'lucide-react';
import type { ViewComponentProps } from './componentMap';

/**
 * FallbackComponent — rendered when the config specifies an unknown view type.
 * Clearly communicates the issue without crashing the app.
 */
export function FallbackComponent({ view }: ViewComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Unknown Component Type</h3>
      <p className="text-sm text-slate-400 max-w-sm">
        The config specifies view type{' '}
        <code className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-amber-300">
          &quot;{view.type}&quot;
        </code>{' '}
        which is not registered in the component map.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Add it with{' '}
        <code className="font-mono text-slate-400">registerComponent(&apos;{view.type}&apos;, YourComponent)</code>
      </p>
    </div>
  );
}
