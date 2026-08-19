import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('core_users', {
    requires_2fa: { type: 'boolean', default: false, notNull: true },
    totp_secret: { type: 'varchar(255)', notNull: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('core_users', ['requires_2fa', 'totp_secret']);
}
