/**
 * notification.service.ts
 *
 * Fires events defined in the app config.
 * Currently supports two action types:
 *   - 'toast'  → sent to connected SSE clients on the frontend
 *   - 'email'  → logs a structured mock email (extend with nodemailer for real SMTP)
 *
 * New action types can be added to the `handlers` map without touching this class.
 */

import type { NormalizedConfig, EventDefinition } from '../../../shared/types/config';
import { logger } from '../utils/logger';
import { Response } from 'express';

export interface NotificationPayload {
  entity?: string;
  record?: unknown;
  id?: string;
  [key: string]: unknown;
}

// SSE client registry — maps userId → Response objects
const sseClients = new Map<string, Set<Response>>();

export class NotificationService {
  constructor(private readonly config: NormalizedConfig) {}

  /** Register an SSE client for a user */
  addSseClient(userId: string, res: Response): void {
    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId)!.add(res);
  }

  /** Remove an SSE client (on disconnect) */
  removeSseClient(userId: string, res: Response): void {
    sseClients.get(userId)?.delete(res);
  }

  /**
   * Fire all config-defined events matching the trigger string.
   * Never throws — event dispatch is best-effort.
   */
  fire(trigger: string, payload: NotificationPayload): void {
    const matchingEvents = this.config.events.filter((ev) => ev.trigger === trigger);

    for (const event of matchingEvents) {
      try {
        this.dispatch(event, payload);
      } catch (err) {
        logger.warn('Notification dispatch failed', { trigger, action: event.action, error: err });
      }
    }
  }

  private dispatch(event: EventDefinition, payload: NotificationPayload): void {
    const handlers: Record<string, () => void> = {
      toast: () => this.handleToast(event, payload),
      email: () => this.handleEmail(event, payload),
    };

    const handler = handlers[event.action];

    if (handler) {
      handler();
    } else {
      // Unknown action type — log and continue. System must not crash.
      logger.warn(`Unknown notification action: "${event.action}"`, { event });
    }
  }

  private handleToast(event: EventDefinition, payload: NotificationPayload): void {
    const message = interpolate(event.message ?? event.trigger, payload);
    const notification = { type: 'toast', message, trigger: event.trigger };

    // Push to all SSE clients for the affected user
    // In a real system, you'd scope this better (e.g., broadcast to specific user)
    for (const [, clients] of sseClients) {
      for (const client of clients) {
        try {
          client.write(`data: ${JSON.stringify(notification)}\n\n`);
        } catch {
          // Client disconnected — ignore
        }
      }
    }

    logger.debug('Toast notification fired', { message, trigger: event.trigger });
  }

  private handleEmail(event: EventDefinition, payload: NotificationPayload): void {
    // Mock email implementation — replace with nodemailer or SendGrid as needed
    const message = interpolate(event.message ?? 'Notification', payload);

    logger.info('📧 [MOCK EMAIL]', {
      to: 'admin@example.com',
      subject: `App notification: ${event.trigger}`,
      body: message,
      payload,
      template: event.template,
    });
  }
}

/** Simple {{variable}} interpolation */
function interpolate(template: string, payload: NotificationPayload): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    String(payload[key] ?? `{{${key}}}`),
  );
}
