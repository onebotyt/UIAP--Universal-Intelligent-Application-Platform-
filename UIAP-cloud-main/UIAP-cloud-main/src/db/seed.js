const bcrypt = require('bcrypt');
const pool = require('./pool');
require('dotenv').config();

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('[seed] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exitCode = 1;
    return;
  }

  const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log(`[seed] Admin user ${email} already exists. Skipping.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    'INSERT INTO admin_users (email, password_hash, display_name) VALUES ($1, $2, $3)',
    [email, passwordHash, 'Dashboard Admin']
  );

  console.log(`[seed] Created admin user: ${email}`);

  // Seed default plans
  const plans = [
    { slug: 'local', name: 'Local Only', price: 0.00 },
    { slug: 'cloud', name: 'Cloud Basic', price: 9.99 },
    { slug: 'hybrid', name: 'Hybrid Pro', price: 29.99 }
  ];

  for (const p of plans) {
    const existingPlan = await pool.query('SELECT id FROM plans WHERE slug = $1', [p.slug]);
    if (existingPlan.rows.length === 0) {
      await pool.query(
        'INSERT INTO plans (slug, name, price_usd) VALUES ($1, $2, $3)',
        [p.slug, p.name, p.price]
      );
      console.log(`[seed] Created plan: ${p.slug}`);
    }
  }

  // Seed default org owner for testing
  const testOwnerEmail = 'owner@example.com';
  const existingOwner = await pool.query('SELECT id FROM org_owners WHERE email = $1', [testOwnerEmail]);
  if (existingOwner.rows.length === 0) {
    const ownerRes = await pool.query(
      'INSERT INTO org_owners (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id',
      [testOwnerEmail, passwordHash, 'Test Org Owner']
    );
    const ownerId = ownerRes.rows[0].id;
    console.log(`[seed] Created test org owner: ${testOwnerEmail}`);

    await pool.query(
      'INSERT INTO organizations (owner_id, name, plan, status) VALUES ($1, $2, $3, $4)',
      [ownerId, 'Test Organization', 'local', 'pending_setup']
    );
    console.log(`[seed] Created test organization for owner`);
  }

  console.log(`[seed] Admin user: ${email}`);
  console.log(`[seed] Org owner : ${testOwnerEmail}`);
  console.log('[seed] You can now log in via POST /dashboard/auth/login or /api/auth/login');
  await pool.end();
}

seed();
