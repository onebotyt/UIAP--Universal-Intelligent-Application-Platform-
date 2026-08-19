import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add manifest column to store the parsed manifest.json for dependency resolution and UI listing
  pgm.addColumn(
    { schema: 'core', name: 'module_installations' },
    {
      manifest: { type: 'jsonb' },
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn({ schema: 'core', name: 'module_installations' }, 'manifest');
}
