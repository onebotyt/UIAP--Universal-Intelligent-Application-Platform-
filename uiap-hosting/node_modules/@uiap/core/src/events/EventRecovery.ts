import { getDb } from '../db/pool.js';

export class EventRecovery {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number = 60000; // Check every 60 seconds
  private readonly staleTimeoutSeconds: number = 60; // Event is stale if PROCESSING > 60s

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

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
      await this.recoverStaleEvents();
    } catch (err) {
      console.error('[EventRecovery] Error in loop:', err);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.loop(), this.intervalMs);
    }
  }

  /**
   * Finds events stuck in PROCESSING state longer than staleTimeoutSeconds
   * and reverts them to PENDING so they can be re-attempted.
   */
  async recoverStaleEvents(): Promise<number> {
    const db = getDb();
    
    // DB agnostic date math
    const cutoffDate = new Date(Date.now() - (this.staleTimeoutSeconds * 1000));
    
    const updatedCount = await db('core_event_inbox')
      .where('status', 'PROCESSING')
      .andWhere('updated_at', '<', cutoffDate)
      .update({
        status: 'PENDING',
        updated_at: db.fn.now()
      });

    return updatedCount;
  }
}
