import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns({ schema: 'core', name: 'users' }, {
    email: { type: 'varchar(255)' },
    avatar_url: { type: 'varchar(255)' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns({ schema: 'core', name: 'users' }, ['email', 'avatar_url']);
}
