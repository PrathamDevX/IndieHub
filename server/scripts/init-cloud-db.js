const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const password = process.argv[2] || process.env.DB_PASSWORD;

  if (!password) {
    console.error('\n❌ Please provide your Aiven database password:\n');
    console.error('   node server/scripts/init-cloud-db.js YOUR_AIVEN_PASSWORD\n');
    process.exit(1);
  }

  const host = process.env.DB_HOST || 'mysql-3a637328-mainprathamchawda1-780e.b.aivencloud.com';
  const port = Number(process.env.DB_PORT || 22864);
  const user = process.env.DB_USER || 'avnadmin';
  const database = process.env.DB_NAME || 'defaultdb';

  console.log(`Connecting to ${host}:${port} as ${user} with SSL...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      multipleStatements: true,
    });
    console.log('✅ Connected successfully to Aiven MySQL!');

    // Read schema.sql
    const schemaPath = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Remove CREATE DATABASE and USE indiehub if targeting defaultdb
    schemaSql = schemaSql
      .replace(/CREATE DATABASE[\s\S]*?;/i, '')
      .replace(/USE\s+indiehub\s*;/i, '');

    console.log('Applying database schema tables...');
    await connection.query(schemaSql);
    console.log('✅ Schema tables created successfully!');

    // Check if status column exists in users, otherwise add it
    try {
      const [cols] = await connection.query(`SHOW COLUMNS FROM users LIKE 'status'`);
      if (cols.length === 0) {
        await connection.query(`
          ALTER TABLE users
            ADD COLUMN status ENUM('active', 'suspended') NOT NULL DEFAULT 'active' AFTER role,
            ADD INDEX idx_users_status (status)
        `);
        console.log('✅ Added user status column from migration.');
      }
    } catch (err) {
      console.warn('Migration status note:', err.message);
    }

    // Seed default Admin User if not exists
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@indiehub.com']);
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await connection.query(
        `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active')`,
        ['Admin', 'admin@indiehub.com', hashedPassword]
      );
      console.log('✅ Seeded default admin user (admin@indiehub.com / Admin123!).');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }

    console.log('\n🎉 Database setup complete! All tables and admin user are ready.');
  } catch (error) {
    console.error('\n❌ Database initialization error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

main();
