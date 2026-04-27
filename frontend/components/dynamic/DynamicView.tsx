'use client';

import { resolveComponent } from '../registry/componentMap';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import type { ViewDefinition, EntityDefinition } from '../../types';

interface DynamicViewProps {
  view: ViewDefinition;
  entity: EntityDefinition;
}

/**
 * DynamicView — resolves the correct component from the registry and renders it.
 * Wraps in an ErrorBoundary so component crashes are contained.
 */
export function DynamicView({ view, entity }: DynamicViewProps) {
  const Component = resolveComponent(view.type);

  return (
    <ErrorBoundary componentName={`${view.type} view`}>
      <Component view={view} entity={entity} />
    </ErrorBoundary>
  );
}
