/**
 * src/middleware/upload.js
 * -------------------------------------------------------------
 * Receives listing photos from the "create/edit listing" form
 * (multipart/form-data) using the multer library.
 *
 * ROBUSTNESS: a bad upload must NEVER crash the request or lose the text
 * the seller typed. Instead of failing, problems are collected in
 * req.uploadErrors and the controller re-shows the form with messages.
 *
 * Checks:
 *   1. type: only JPEG, PNG or WebP (declared type)
 *   2. size: max 2 MB per photo, max 5 photos
 *   3. content: the first bytes must really be an image ("magic numbers"),
 *      so a renamed .exe or .pdf is rejected even if it claims to be a .jpg
 *
 * IMPORTANT: in the form, the file input must come AFTER the text fields.
 * If an upload is rejected part-way, multer has already read the fields
 * before it, so the seller's text is still in req.body.
 */
const multer = require('multer');
const { MAX_PHOTOS } = require('../models/Listing');

const MAX_PHOTO_MB = 2;
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Checks the file's first bytes against known image signatures.
 * @param {Buffer} buf
 * @returns {boolean}
 */
function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  return isJpeg || isPng || isWebp;
}

const multerUpload = multer({
  storage: multer.memoryStorage(), // keep in memory; the controller saves them to MongoDB
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    req.uploadErrors.push(`"${file.originalname}" is not a JPEG, PNG or WebP image.`);
    cb(null, false); // skip this file, keep going
  },
});

// Friendly text for multer's error codes.
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Each photo must be ${MAX_PHOTO_MB} MB or smaller.`,
  LIMIT_FILE_COUNT: `You can upload at most ${MAX_PHOTOS} photos.`,
  LIMIT_UNEXPECTED_FILE: `You can upload at most ${MAX_PHOTOS} photos.`,
};

/**
 * Route middleware:  router.post('/listings', photoUpload, controller.create)
 * After it runs: req.files = valid photos, req.uploadErrors = problems found.
 */
function photoUpload(req, res, next) {
  req.uploadErrors = [];

  multerUpload.array('photos', MAX_PHOTOS)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      req.uploadErrors.push(MULTER_MESSAGES[err.code] || 'The photo upload failed. Please try again.');
      req.files = []; // a rejected batch is discarded entirely
    } else if (err) {
      return next(err); // unexpected (e.g. connection dropped): let the error handler deal with it
    }

    req.body = req.body || {};
    req.files = (req.files || []).filter((file) => {
      if (looksLikeImage(file.buffer)) return true;
      req.uploadErrors.push(`"${file.originalname}" is not a valid image file.`);
      return false;
    });
    next();
  });
}

module.exports = { photoUpload, MAX_PHOTO_BYTES, MAX_PHOTO_MB };
