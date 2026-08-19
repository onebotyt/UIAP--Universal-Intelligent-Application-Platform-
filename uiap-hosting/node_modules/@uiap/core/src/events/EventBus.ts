import { UIAPEvent, EventSubscriber, EventBusPublishResult } from './types.js';

/**
 * UIAP EventBus
 *
 * An instance-based asynchronous event bus that allows Core and modules
 * to communicate without tight coupling.
 *
 * Features:
 * - Registration order is preserved.
 * - Failsafe subscriber execution: one failed subscriber does not prevent others from running.
 * - Strict validation of event format (dot-separated types).
 */
export class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private subscribers = new Map<string, Set<EventSubscriber<any>>>();

  /**
   * Subscribes a handler to a specific event type.
   *
   * @param type The exact event type string (e.g. "module.action_occurred")
   * @param handler The subscriber function (can be async)
   * @returns A function that can be called to unsubscribe the handler
   */
  subscribe<T = unknown>(type: string, handler: EventSubscriber<T>): () => void {
    this.validateTypeFormat(type);
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler);

    return () => {
      this.unsubscribe(type, handler);
    };
  }

  /**
   * Unsubscribes a previously registered handler from a specific event type.
   *
   * @param type The exact event type string
   * @param handler The subscriber function to remove
   */
  unsubscribe<T = unknown>(type: string, handler: EventSubscriber<T>): void {
    this.validateTypeFormat(type);
    const handlers = this.subscribers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(type);
      }
    }
  }

  /**
   * Publishes an event to all registered subscribers sequentially in registration order.
   *
   * Validation ensures `type` is dot-separated and non-empty.
   * If a subscriber throws an error, it is caught and reported in the result's `errors` array,
   * allowing subsequent subscribers to still receive the event.
   *
   * @param event The event to publish
   * @returns A promise resolving to the delivery result including any errors
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async publish(event: UIAPEvent<any>): Promise<EventBusPublishResult> {
    this.validateEvent(event);

    const handlers = this.subscribers.get(event.type);
    const result: EventBusPublishResult = { delivered: 0, errors: [] };

    if (!handlers || handlers.size === 0) {
      return result;
    }

    // Process sequentially to maintain registration order delivery guarantees
    for (const handler of handlers) {
      try {
        await handler(event);
        result.delivered++;
      } catch (error) {
        result.errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateEvent(event: UIAPEvent<any>): void {
    if (!event || typeof event !== 'object') {
      throw new Error('Event must be a valid object');
    }
    if (!event.id) {
      throw new Error('Event must have an id');
    }

    this.validateTypeFormat(event.type);

    if (event.occurredAt === undefined || event.occurredAt === null) {
      throw new Error('Event must have an occurredAt timestamp');
    }
    if (!event.source) {
      throw new Error('Event must have a source identifier');
    }
  }

  private validateTypeFormat(type: string | undefined): void {
    if (!type || typeof type !== 'string' || !/^[a-zA-Z0-9]+(\.[a-zA-Z0-9_-]+)+$/.test(type)) {
      throw new Error(
        `Invalid event type format: "${type}". Must be a non-empty dot-separated name (e.g., "module.action")`,
      );
    }
  }
}
