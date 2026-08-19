import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    INSERT INTO core.permissions (module_name, action, description) VALUES
    ('core.users', 'view', 'View users and their assigned roles'),
    ('core.users', 'manage', 'Create users, modify status, and assign roles'),
    ('core.roles', 'view', 'View roles and their assigned permissions'),
    ('core.roles', 'manage', 'Create roles and assign permissions')
    ON CONFLICT (module_name, action) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM core.permissions
    WHERE module_name IN ('core.users', 'core.roles')
    AND action IN ('view', 'manage');
  `);
}
