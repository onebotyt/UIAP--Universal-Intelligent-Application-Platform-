const pool = require('./pool');

// Fire-and-forget audit log write. Failures here should never break the main request.
async function logAction(actor, action, target, metadata = {}) {
  try {
    await pool.query(
      'INSERT INTO audit_log_cloud (actor, action, target, metadata) VALUES ($1, $2, $3, $4)',
      [actor, action, target, metadata]
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log entry:', err.message);
  }
}

module.exports = { logAction };
