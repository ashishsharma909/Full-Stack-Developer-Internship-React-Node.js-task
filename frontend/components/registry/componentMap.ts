/**
 * componentMap.ts — The Component Registry
 *
 * This is the extensibility core of the frontend.
 * Any view type defined in the config is resolved through this map.
 *
 * To add a new component:
 *   1. Create your component (e.g., components/dynamic/DynamicChart.tsx)
 *   2. Add one line: registerComponent('chart', DynamicChart)
 *   3. Use "type": "chart" in your config views
 *
 * No other files need to change.
 */

import { ComponentType } from 'react';
import { DynamicForm } from '../dynamic/DynamicForm';
import { DynamicTable } from '../dynamic/DynamicTable';
import { DynamicDashboard } from '../dynamic/DynamicDashboard';
import { FallbackComponent } from './FallbackComponent';
import type { ViewDefinition, EntityDefinition } from '../../types';

export interface ViewComponentProps {
  view: ViewDefinition;
  entity: EntityDefinition;
}

type ComponentRegistry = Map<string, ComponentType<ViewComponentProps>>;

const registry: ComponentRegistry = new Map([
  ['form', DynamicForm as ComponentType<ViewComponentProps>],
  ['table', DynamicTable as ComponentType<ViewComponentProps>],
  ['dashboard', DynamicDashboard as ComponentType<ViewComponentProps>],
]);


/**
 * Resolve a component by view type.
 * Returns FallbackComponent for unknown types — never throws.
 */
export function resolveComponent(type: string): ComponentType<ViewComponentProps> {
  return registry.get(type) ?? FallbackComponent;
}

/**
 * Register a new view component type.
 * Call this from any module before the app renders.
 */
export function registerComponent(
  type: string,
  component: ComponentType<ViewComponentProps>,
): void {
  registry.set(type, component);
}

/** List all registered types — useful for admin/debug UI */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}
