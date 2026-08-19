import { query, transaction } from '../db/pool.js';

export type EventStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'REJECTED';

export interface PersistentEvent {
  id: string;
  eventId: string;
  eventType: string;
  source: string;
  sourceId: string;
  occurredAt: Date;
  receivedAt: Date;
  payload: unknown;
  status: EventStatus;
  attemptCount: number;
  availableAt: Date;
  processedAt?: Date | null;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EventStore {
  /**
   * Appends a new event to the persistent inbox.
   * Returns 'accepted' if successfully inserted, or 'duplicate' if the eventId already exists.
   */
  static async appendEvent(params: {
    eventId: string;
    eventType: string;
    source: string;
    sourceId: string;
    occurredAt: string | Date;
    payload: unknown;
  }): Promise<'accepted' | 'duplicate'> {
    try {
      await query(
        `
        INSERT INTO core.event_inbox (event_id, event_type, source, source_id, occurred_at, payload)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          params.eventId,
          params.eventType,
          params.source,
          params.sourceId,
          new Date(params.occurredAt),
          params.payload,
        ],
      );
      return 'accepted';
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        // PostgreSQL unique_violation
        return 'duplicate';
      }
      throw error;
    }
  }

  /**
   * Claims a batch of pending events for processing.
   * Uses FOR UPDATE SKIP LOCKED to prevent concurrent dispatchers from grabbing the same events.
   */
  static async claimEvents(batchSize: number = 50): Promise<PersistentEvent[]> {
    return transaction(async (client) => {
      const result = await client.query(
        `
        UPDATE core.event_inbox
        SET status = 'PROCESSING',
            updated_at = current_timestamp
        WHERE id IN (
          SELECT id
          FROM core.event_inbox
          WHERE status = 'PENDING'
            AND available_at <= current_timestamp
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        RETURNING *
      `,
        [batchSize],
      );

      return result.rows.map(this.mapRowToEvent);
    });
  }

  /**
   * Marks an event as successfully processed.
   */
  static async markProcessed(id: string): Promise<void> {
    await query(
      `
      UPDATE core.event_inbox
      SET status = 'PROCESSED',
          processed_at = current_timestamp,
          updated_at = current_timestamp
      WHERE id = $1
    `,
      [id],
    );
  }

  /**
   * Marks an event as failed.
   * Increments attempt_count. If attempt_count >= maxAttempts, sets status to 'FAILED'.
   * Otherwise sets status to 'PENDING' and computes exponential backoff for available_at.
   */
  static async markFailed(id: string, error: Error, maxAttempts: number = 4): Promise<void> {
    await transaction(async (client) => {
      const res = await client.query(
        `SELECT attempt_count FROM core.event_inbox WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (res.rowCount === 0) return;

      const attemptCount = res.rows[0].attempt_count + 1;
      const errorMessage = (error as Error).message || String(error);

      if (attemptCount >= maxAttempts) {
        await client.query(
          `
          UPDATE core.event_inbox
          SET status = 'FAILED',
              attempt_count = $2,
              last_error = $3,
              updated_at = current_timestamp
          WHERE id = $1
        `,
          [id, attemptCount, errorMessage],
        );
      } else {
        // Exponential backoff: 1s, 5s, 30s, etc. We'll just approximate
        // Or simple bounded schedule: Math.pow(5, attemptCount - 1) seconds
        let backoffSeconds = 1;
        if (attemptCount === 2) backoffSeconds = 5;
        if (attemptCount === 3) backoffSeconds = 30;
        if (attemptCount >= 4) backoffSeconds = 300;

        await client.query(
          `
          UPDATE core.event_inbox
          SET status = 'PENDING',
              attempt_count = $2,
              last_error = $3,
              available_at = current_timestamp + interval '1 second' * $4,
              updated_at = current_timestamp
          WHERE id = $1
        `,
          [id, attemptCount, errorMessage, backoffSeconds],
        );
      }
    });
  }

  /**
   * Marks an event as permanently rejected (e.g. invalid format that can never succeed).
   */
  static async markRejected(id: string, reason: string): Promise<void> {
    await query(
      `
      UPDATE core.event_inbox
      SET status = 'REJECTED',
          last_error = $2,
          updated_at = current_timestamp
      WHERE id = $1
    `,
      [id, reason],
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mapRowToEvent(row: any): PersistentEvent {
    return {
      id: row.id,
      eventId: row.event_id,
      eventType: row.event_type,
      source: row.source,
      sourceId: row.source_id,
      occurredAt: row.occurred_at,
      receivedAt: row.received_at,
      payload: row.payload,
      status: row.status,
      attemptCount: row.attempt_count,
      availableAt: row.available_at,
      processedAt: row.processed_at,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
