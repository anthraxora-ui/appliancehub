/**
 * server.js  -  ENTRY POINT  (run with `npm run dev` or `npm start`)
 * -------------------------------------------------------------
 * Startup order matters:
 *   1. connect to the database
 *   2. only then start accepting web requests
 * If the database fails, we print the reason and exit instead of running
 * a half-working website (robustness).
 */
const config = require('./src/config');
const { connectDB, disconnectDB, usingMemoryDB } = require('./src/config/db');
const { seedDemoData } = require('./src/config/seed');
const createApp = require('./src/app');

async function start() {
  try {
    const dbLabel = await connectDB();
    console.log(`✔ Database connected: ${dbLabel}`);

    // Fill the empty development database with demo accounts (see seed.js).
    if (usingMemoryDB()) {
      const created = await seedDemoData();
      if (created) console.log(`✔ Demo data created (${created} users, see src/config/seed.js)`);
    }

    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`✔ ${config.appName} running at http://localhost:${config.port}`);
    });

    // Graceful shutdown: finish current requests, close the DB, then exit.
    const shutdown = async (signal) => {
      console.log(`\n${signal} received - shutting down...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);  // Ctrl+C in the terminal
    process.on('SIGTERM', shutdown); // Render stopping/redeploying the app
  } catch (err) {
    console.error('✘ Failed to start the server:', err.message);
    process.exit(1);
  }
}

start();
