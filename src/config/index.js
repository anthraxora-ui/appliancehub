/**
 * src/config/index.js
 * -------------------------------------------------------------
 * ONE place that reads environment variables (from the .env file
 * locally, or from Render's dashboard in production).
 *
 * Every other file imports settings from here instead of reading
 * process.env directly. If a setting ever changes name, we only
 * fix it in this file.
 */
require('dotenv').config(); // loads .env into process.env

const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Empty string means "use the in-memory development database".
  mongoUri: process.env.MONGODB_URI || '',

  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret',

  appName: 'ApplianceHub',
};

// Fail early and clearly: running in production without a real database
// or with the default secret would be a serious bug, so we refuse to start.
if (config.isProduction) {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI must be set in production.');
  }
  if (config.sessionSecret === 'dev-only-secret') {
    throw new Error('SESSION_SECRET must be set in production.');
  }
}

module.exports = config;
