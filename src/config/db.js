/**
 * src/config/db.js
 * -------------------------------------------------------------
 * Connects the application to MongoDB using Mongoose.
 *
 * Two modes:
 *   1. MONGODB_URI is set  -> connect to that database (MongoDB Atlas).
 *   2. MONGODB_URI is empty -> start a throw-away local MongoDB.
 *      Data is reset on every start. Perfect for development and demos
 *      because no team member has to install MongoDB.
 *
 * DISK SPACE: the throw-away database keeps its files in ONE fixed temp
 * folder per kind of run (dev / test / benchmark), which is wiped at every
 * start. (Without this, every nodemon restart on Windows left a ~300 MB
 * folder behind, because the process is killed before it can clean up.)
 */
const dns = require('dns');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./index');

// Kept so we can shut the in-memory server down cleanly.
let memoryServer = null;

/**
 * Opens the database connection.
 * @returns {Promise<string>} a short description of which database is used
 */
async function connectDB() {
  let uri = config.mongoUri;
  let label = 'MongoDB Atlas';

  if (!uri) {
    // Loaded only when needed: this package is a devDependency and is
    // not installed on the production server.
    const { MongoMemoryServer } = require('mongodb-memory-server');

    // e.g. %TEMP%/appliancehub-db-dev  (MEMORY_DB_NAME=test / benchmark for other runs)
    const dbPath = path.join(os.tmpdir(), `appliancehub-db-${process.env.MEMORY_DB_NAME || 'dev'}`);
    fs.rmSync(dbPath, { recursive: true, force: true }); // wipe the previous run's files
    fs.mkdirSync(dbPath, { recursive: true });

    memoryServer = await MongoMemoryServer.create({ instance: { dbPath } });
    uri = memoryServer.getUri('appliance_marketplace');
    label = 'in-memory MongoDB (development, data resets on restart)';
  }

  // Windows workaround: on some Windows builds Node can't read the system DNS
  // settings and falls back to 127.0.0.1, so the special lookup that
  // "mongodb+srv://" addresses need fails with "querySrv ECONNREFUSED".
  // If Node only knows the loopback address, use public DNS servers instead.
  // (DNS_SERVERS=1.1.1.1,8.8.8.8 in .env can force specific servers.)
  if (uri.startsWith('mongodb+srv://')) {
    const loopbackOnly = dns.getServers().every((s) => s === '127.0.0.1' || s === '::1');
    const servers = process.env.DNS_SERVERS
      ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
      : loopbackOnly ? ['1.1.1.1', '8.8.8.8'] : null;
    if (servers) {
      dns.setServers(servers);
      dns.promises.setServers(servers);
    }
  }

  // Robustness: give up after 10 s instead of hanging forever if the
  // database is unreachable, so the error is reported quickly.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return label;
}

/**
 * Closes the connection (and the in-memory server, if one was started).
 * Called when the process is asked to stop (Ctrl+C or Render redeploy).
 */
async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

/**
 * Human-readable connection state, used by the /health page.
 * Mongoose readyState: 0 = disconnected, 1 = connected,
 *                      2 = connecting,   3 = disconnecting
 */
function dbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

/** True when running on the temporary in-memory database (development). */
function usingMemoryDB() {
  return memoryServer !== null;
}

module.exports = { connectDB, disconnectDB, dbStatus, usingMemoryDB };
