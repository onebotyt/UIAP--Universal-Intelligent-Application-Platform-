import { EventStore } from './EventStore.js';
import { EventBus } from './EventBus.js';

export class EventDispatcher {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number = 1000;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Starts the background dispatcher loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  /**
   * Stops the background dispatcher loop cleanly.
   */
  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async loop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.dispatchPendingEvents();
    } catch (err) {
      console.error('[EventDispatcher] Error in loop:', err);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.loop(), this.intervalMs);
    }
  }

  /**
   * Manually processes a batch of pending events. Useful for tests.
   */
  async dispatchPendingEvents(): Promise<void> {
    const events = await EventStore.claimEvents(50);
    if (events.length === 0) return;

    for (const record of events) {
      try {
        const result = await this.eventBus.publish({
          id: record.eventId,
          type: record.eventType,
          source: record.source,
          occurredAt: record.occurredAt.toISOString(),
          payload: record.payload,
        });

        if (result.errors.length > 0) {
          // One or more subscribers failed. We consider the event failed so it can be retried.
          // In a more complex system, we might track per-subscriber success.
          await EventStore.markFailed(record.id, result.errors[0]);
        } else {
          await EventStore.markProcessed(record.id);
        }
      } catch (err: unknown) {
        // This catches errors outside of subscriber execution (e.g. validation errors in EventBus)
        // If it's a validation error, it will likely never succeed, so we could reject it.
        await EventStore.markFailed(record.id, err instanceof Error ? err : new Error(String(err)));
      }
    }
  }
}
