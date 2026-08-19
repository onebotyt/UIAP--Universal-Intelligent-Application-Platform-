import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add installed_versions to track history of installed versions
  // The existing 'version' column continues to represent the active/selected version
  pgm.addColumn(
    { schema: 'core', name: 'module_installations' },
    {
      installed_versions: {
        type: 'jsonb',
        notNull: true,
        default: pgm.func(`'[]'::jsonb`),
      },
    },
  );

  // Initialize existing rows with their current version
  pgm.sql(`
    UPDATE core.module_installations
    SET installed_versions = jsonb_build_array(version)
    WHERE installed_versions = '[]'::jsonb
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn({ schema: 'core', name: 'module_installations' }, 'installed_versions');
}
