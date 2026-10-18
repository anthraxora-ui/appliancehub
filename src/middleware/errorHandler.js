/**
 * src/middleware/errorHandler.js
 * -------------------------------------------------------------
 * ROBUSTNESS: whatever goes wrong inside a controller, the user sees a
 * clear message page and the server keeps running for everyone else.
 *
 * Express 5 automatically forwards errors thrown inside async
 * controllers to `errorHandler`, so controllers don't need try/catch
 * around every database call.
 */
const config = require('../config');

/**
 * Creates an error that carries an HTTP status code.
 * Controllers use it like:  throw httpError(404, 'Listing not found');
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Runs when no route matched the URL. */
function notFound(req, res, next) {
  next(httpError(404, `The page "${req.originalUrl}" does not exist.`));
}

/**
 * Runs when any route or controller throws an error.
 * Express recognises an error handler by its FOUR parameters.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;

  // Invalid MongoDB id in a URL (e.g. /listings/abc) -> treat as "not found"
  // instead of a server error.
  if (err.name === 'CastError') {
    status = 404;
    message = 'The item you are looking for does not exist.';
  }

  // Mongoose validation failed (e.g. a required field was empty).
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(' ');
  }

  // MongoDB unique index violated (e.g. two sign-ups with the same email
  // at the same moment, after both passed the controller's check).
  if (err.code === 11000) {
    status = 409;
    message = 'This record already exists.';
  }

  // Unexpected errors: log details for developers, but never show
  // internal details (stack traces) to users in production.
  if (status >= 500) {
    console.error(err);
    if (config.isProduction) message = 'Something went wrong on our side. Please try again.';
  }

  res.status(status);

  // API/fetch requests get JSON; normal page visits get an HTML page.
  if (req.accepts(['html', 'json']) === 'json') {
    return res.json({ error: message });
  }
  res.render('pages/error', { title: `Error ${status}`, status, message });
}

module.exports = { httpError, notFound, errorHandler };
