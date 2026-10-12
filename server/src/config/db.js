import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'moviebox_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create the connection pool
export const pool = mysql.createPool(dbConfig);

// Helper to check DB health
export async function checkDbHealth() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return {
      connected: true,
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      host: dbConfig.host,
      port: dbConfig.port
    };
  }
}

export default pool;
