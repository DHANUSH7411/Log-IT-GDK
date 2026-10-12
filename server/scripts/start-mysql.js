import net from 'net';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const port = parseInt(process.env.DB_PORT || '3307', 10);
const host = process.env.DB_HOST || '127.0.0.1';

function checkPort(h, p) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(p, h);
  });
}

async function main() {
  const isOpen = await checkPort(host, port);
  if (isOpen) {
    console.log(`MySQL is already running on ${host}:${port}.`);
    return;
  }

  console.log(`Starting local MySQL server on ${host}:${port}...`);
  const dataDir = path.resolve(__dirname, '../data/mysql_data');
  const socketPath = `/tmp/moviebox_mysql${port}.sock`;

  const child = spawn(
    '/usr/local/mysql/bin/mysqld',
    [
      `--datadir=${dataDir}`,
      `--port=${port}`,
      `--socket=${socketPath}`,
      '--mysqlx=OFF'
    ],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();

  // Wait a few seconds for startup
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    const ready = await checkPort(host, port);
    if (ready) {
      console.log(`MySQL started successfully on port ${port}.`);
      return;
    }
  }
  console.log(`MySQL spawn initiated (port ${port}).`);
}

main();
