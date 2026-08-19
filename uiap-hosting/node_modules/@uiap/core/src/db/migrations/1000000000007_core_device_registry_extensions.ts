import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Alter device_registry
  pgm.addColumns(
    { schema: 'core', name: 'device_registry' },
    {
      type: { type: 'varchar(255)' },
      enabled: { type: 'boolean', notNull: true, default: true },
      credential_hash: { type: 'varchar(255)' },
    },
  );

  // 2. Add device_events_log for idempotency tracking
  pgm.createTable(
    { schema: 'core', name: 'device_events_log' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      event_id: { type: 'varchar(255)', notNull: true, unique: true },
      device_id: { type: 'varchar(255)', notNull: true },
      event_type: { type: 'varchar(255)', notNull: true },
      occurred_at: { type: 'timestamp', notNull: true },
      created_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  // 3. Create the new permissions
  pgm.sql(`
    INSERT INTO core.permissions (module_name, action, description) VALUES
      ('devices', 'view', 'Allows viewing available devices'),
      ('devices', 'manage', 'Allows managing and registering devices')
    ON CONFLICT (module_name, action) DO NOTHING;
  `);

  // 4. Assign these permissions to the 'Administrator' role automatically
  pgm.sql(`
    INSERT INTO core.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM core.roles r
    CROSS JOIN core.permissions p
    WHERE r.name = 'Administrator'
      AND p.module_name = 'devices' 
      AND p.action IN ('view', 'manage')
    ON CONFLICT DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove from Administrator role
  pgm.sql(`
    DELETE FROM core.role_permissions
    WHERE permission_id IN (
      SELECT id FROM core.permissions
      WHERE module_name = 'devices' AND action IN ('view', 'manage')
    );
  `);

  // Delete the permissions
  pgm.sql(`
    DELETE FROM core.permissions
    WHERE module_name = 'devices' AND action IN ('view', 'manage');
  `);

  // Drop device_events_log
  pgm.dropTable({ schema: 'core', name: 'device_events_log' });

  // Remove columns from device_registry
  pgm.dropColumns({ schema: 'core', name: 'device_registry' }, [
    'type',
    'enabled',
    'credential_hash',
  ]);
}
