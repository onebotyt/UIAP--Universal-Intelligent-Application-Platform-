const db = require('./pool');

async function migrate() {
  console.log('[migrate] Applying Knex schema...');
  try {
    const hasAdminUsers = await db.schema.hasTable('admin_users');
    if (!hasAdminUsers) {
      await db.schema.createTable('admin_users', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.string('email').unique().notNullable();
        t.string('password_hash').notNullable();
        t.string('display_name');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasOrgOwners = await db.schema.hasTable('org_owners');
    if (!hasOrgOwners) {
      await db.schema.createTable('org_owners', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.string('email').unique().notNullable();
        t.string('password_hash').notNullable();
        t.string('display_name');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasOrgs = await db.schema.hasTable('organizations');
    if (!hasOrgs) {
      await db.schema.createTable('organizations', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.uuid('owner_id').references('id').inTable('org_owners').onDelete('CASCADE');
        t.string('name').notNullable();
        t.string('plan').notNullable().defaultTo('local');
        t.string('status').notNullable().defaultTo('pending_setup');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasPlans = await db.schema.hasTable('plans');
    if (!hasPlans) {
      await db.schema.createTable('plans', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.string('slug').unique().notNullable();
        t.string('name').notNullable();
        t.decimal('price_usd', 10, 2).notNullable();
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasTransactions = await db.schema.hasTable('transactions');
    if (!hasTransactions) {
      await db.schema.createTable('transactions', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.uuid('organization_id').references('id').inTable('organizations');
        t.string('type').notNullable();
        t.uuid('target_id');
        t.decimal('amount_usd', 10, 2).notNullable();
        t.string('transaction_ref').notNullable();
        t.string('status').notNullable().defaultTo('pending');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasInstallations = await db.schema.hasTable('installations');
    if (!hasInstallations) {
      await db.schema.createTable('installations', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
        t.string('name');
        t.string('install_key_hash').notNullable();
        t.string('core_version');
        t.timestamp('last_seen_at');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasModules = await db.schema.hasTable('modules');
    if (!hasModules) {
      await db.schema.createTable('modules', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.string('slug').unique().notNullable();
        t.string('display_name').notNullable();
        t.text('description');
        t.decimal('price_usd', 10, 2).notNullable().defaultTo(0.00);
        t.uuid('owner_admin_id').references('id').inTable('admin_users');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasModuleVersions = await db.schema.hasTable('module_versions');
    if (!hasModuleVersions) {
      await db.schema.createTable('module_versions', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.uuid('module_id').notNullable().references('id').inTable('modules').onDelete('CASCADE');
        t.string('version').notNullable();
        t.text('changelog');
        t.string('core_compat_range');
        t.string('package_path');
        t.binary('package_data');
        t.string('package_hash');
        t.string('signature');
        t.string('status').notNullable().defaultTo('draft');
        t.timestamp('created_at').defaultTo(db.fn.now());
        t.unique(['module_id', 'version']);
      });
    }

    const hasLicenses = await db.schema.hasTable('licenses');
    if (!hasLicenses) {
      await db.schema.createTable('licenses', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
        t.uuid('module_id').notNullable().references('id').inTable('modules').onDelete('CASCADE');
        t.string('plan').notNullable().defaultTo('standard');
        t.string('status').notNullable().defaultTo('active');
        t.timestamp('starts_at').defaultTo(db.fn.now());
        t.timestamp('expires_at');
        t.unique(['organization_id', 'module_id']);
      });
    }

    const hasBetaAccess = await db.schema.hasTable('beta_access');
    if (!hasBetaAccess) {
      await db.schema.createTable('beta_access', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
        t.uuid('module_id').notNullable().references('id').inTable('modules').onDelete('CASCADE');
        t.timestamp('granted_at').defaultTo(db.fn.now());
        t.unique(['organization_id', 'module_id']);
      });
    }

    const hasAuditLog = await db.schema.hasTable('audit_log_cloud');
    if (!hasAuditLog) {
      await db.schema.createTable('audit_log_cloud', (t) => {
        t.uuid('id').primary().defaultTo(db.fn.uuid());
        t.string('actor').notNullable();
        t.string('action').notNullable();
        t.string('target');
        t.json('metadata');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    console.log('[migrate] Done. All tables are up to date.');
  } catch (err) {
    console.error('[migrate] Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

migrate();
