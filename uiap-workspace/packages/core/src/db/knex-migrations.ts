import type { Knex } from 'knex';

export const coreMigrations = [
  {
    name: '001_initial_core',
    up: async (knex: Knex) => {
      // Users
      await knex.schema.createTable('core_users', (table) => {
        table.uuid('id').primary();
        table.string('username').notNullable().unique();
        table.string('password_hash').notNullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.boolean('requires_2fa').notNullable().defaultTo(false);
        table.string('totp_secret').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });

      // Roles
      await knex.schema.createTable('core_roles', (table) => {
        table.uuid('id').primary();
        table.string('name').notNullable().unique();
        table.string('description').nullable();
        table.boolean('is_system').notNullable().defaultTo(false);
      });

      // User Roles
      await knex.schema.createTable('core_user_roles', (table) => {
        table.uuid('id').primary();
        table.uuid('user_id').references('id').inTable('core_users').onDelete('CASCADE');
        table.uuid('role_id').references('id').inTable('core_roles').onDelete('CASCADE');
        table.unique(['user_id', 'role_id']);
      });

      // Permissions
      await knex.schema.createTable('core_permissions', (table) => {
        table.uuid('id').primary();
        table.string('module_name').notNullable();
        table.string('action').notNullable();
        table.string('description').nullable();
        table.unique(['module_name', 'action']);
      });

      // Role Permissions
      await knex.schema.createTable('core_role_permissions', (table) => {
        table.uuid('id').primary();
        table.uuid('role_id').references('id').inTable('core_roles').onDelete('CASCADE');
        table
          .uuid('permission_id')
          .references('id')
          .inTable('core_permissions')
          .onDelete('CASCADE');
        table.unique(['role_id', 'permission_id']);
      });

      // Module Installations
      await knex.schema.createTable('core_module_installations', (table) => {
        table.string('id').primary(); // Usually string like 'attendance'
        table.string('version').notNullable();
        table.boolean('is_enabled').notNullable().defaultTo(true);
        table.text('config').nullable();
        table.timestamp('installed_at').defaultTo(knex.fn.now());
      });

      // Device Registry
      await knex.schema.createTable('core_device_registry', (table) => {
        table.uuid('id').primary();
        table.string('hardware_id').notNullable().unique();
        table.string('name').notNullable();
        table.string('type').notNullable();
        table.string('status').notNullable().defaultTo('REGISTERED');
        table.boolean('enabled').notNullable().defaultTo(true);
        table.string('credential_hash').nullable();
        table.timestamp('last_heartbeat_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });

      // Device Events Log (Idempotency)
      await knex.schema.createTable('core_device_events_log', (table) => {
        table.string('event_id').primary(); // String from hardware
        table.string('device_id').notNullable();
        table.string('event_type').notNullable();
        table.timestamp('occurred_at').notNullable();
        table.timestamp('logged_at').defaultTo(knex.fn.now());
      });

      // Event Inbox
      await knex.schema.createTable('core_event_inbox', (table) => {
        table.uuid('id').primary();
        table.string('event_id').notNullable().unique();
        table.string('event_type').notNullable();
        table.string('source').notNullable();
        table.string('source_id').nullable();
        table.text('payload').notNullable(); // Stored as JSON string
        table.string('status').notNullable().defaultTo('PENDING'); // PENDING, PROCESSING, FAILED, COMPLETED
        table.integer('attempt_count').notNullable().defaultTo(0);
        table.timestamp('received_at').defaultTo(knex.fn.now());
        table.timestamp('processed_at').nullable();
        table.text('last_error').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });

      // Sync Queue
      await knex.schema.createTable('core_sync_queue', (table) => {
        table.uuid('id').primary();
        table.string('module_id').notNullable();
        table.string('action').notNullable();
        table.string('table_name').notNullable();
        table.string('record_id').notNullable();
        table.text('data').nullable();
        table.string('status').notNullable().defaultTo('PENDING');
        table.integer('retry_count').notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());
      });

      // Audit Logs
      await knex.schema.createTable('core_audit_logs', (table) => {
        table.uuid('id').primary();
        table.string('action').notNullable();
        table.string('actor_id').nullable();
        table.string('ip_address').nullable();
        table.text('details').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
      });
    },
    down: async (knex: Knex) => {
      await knex.schema.dropTableIfExists('core_audit_logs');
      await knex.schema.dropTableIfExists('core_sync_queue');
      await knex.schema.dropTableIfExists('core_event_inbox');
      await knex.schema.dropTableIfExists('core_device_events_log');
      await knex.schema.dropTableIfExists('core_device_registry');
      await knex.schema.dropTableIfExists('core_module_installations');
      await knex.schema.dropTableIfExists('core_role_permissions');
      await knex.schema.dropTableIfExists('core_permissions');
      await knex.schema.dropTableIfExists('core_user_roles');
      await knex.schema.dropTableIfExists('core_roles');
      await knex.schema.dropTableIfExists('core_users');
    },
  },
];
