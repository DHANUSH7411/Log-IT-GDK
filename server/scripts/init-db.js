import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const useSSL = process.env.DB_SSL === 'true';
const targetDb = process.env.DB_NAME || 'moviebox_db';

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: targetDb,
  multipleStatements: true,
  ...(useSSL && {
    ssl: {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
      ...(process.env.DB_SSL_CA && { ca: process.env.DB_SSL_CA })
    }
  })
};

async function initDatabase() {
  console.log(`Connecting to MySQL at ${config.host}:${config.port}/${targetDb} as ${config.user}...`);
  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log(`Connected to MySQL server (target database: ${targetDb}).`);

    // Ensure the target database exists and is selected
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    } catch (createErr) {
      const isPermissionDenied =
        createErr.code === 'ER_DBACCESS_DENIED_ERROR' ||
        createErr.code === 'ER_ACCESS_DENIED_ERROR' ||
        createErr.errno === 1044 ||
        createErr.errno === 1045;

      if (isPermissionDenied) {
        console.log(`Note: Lacked privileges to run CREATE DATABASE for '${targetDb}'. Proceeding to USE existing database.`);
      } else {
        throw createErr;
      }
    }
    await connection.query(`USE \`${targetDb}\`;`);

    const schemaPath = path.join(__dirname, '../db/schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Remove any hardcoded CREATE DATABASE / USE statements so tables are created in targetDb
    schemaSql = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS\s+`?moviebox_db`?[^;]*;/gi, '')
      .replace(/USE\s+`?moviebox_db`?;/gi, '');

    console.log(`Executing schema.sql in ${targetDb}...`);
    await connection.query(schemaSql);
    console.log(`Database and tables initialized successfully in ${targetDb}.`);

    // Seed demo user if none exists
    const [existingUsers] = await connection.query('SELECT id, email FROM users WHERE email = ?', ['demo@moviebox.local']);
    if (existingUsers.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      await connection.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Demo Explorer', 'demo@moviebox.local', hash, 'user']
      );
      console.log('Seeded demo user: demo@moviebox.local / password123');
    } else {
      console.log('Demo user already exists.');
    }

    // Check table counts
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Verified tables in database: ${tables.map(t => Object.values(t)[0]).join(', ')}`);
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(`Hint: Ensure MySQL is running on ${config.host}:${config.port}.`);
      console.error('To run MovieBox custom MySQL server on macOS, run:');
      console.error('/usr/local/mysql/bin/mysqld --datadir="$(pwd)/server/data/mysql_data" --port=3307 --socket=/tmp/moviebox_mysql3307.sock --mysqlx=OFF &');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
