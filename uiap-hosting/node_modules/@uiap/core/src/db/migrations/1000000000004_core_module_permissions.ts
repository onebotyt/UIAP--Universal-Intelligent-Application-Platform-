import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Seed permissions for module management
  pgm.sql(`
    INSERT INTO core.permissions (module_name, action, description) VALUES
    ('core.modules', 'view', 'View installed modules'),
    ('core.modules', 'manage', 'Install, enable, and disable modules')
    ON CONFLICT (module_name, action) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM core.permissions WHERE module_name = 'core.modules' AND action IN ('view', 'manage');
  `);
}
