/**
 * src/models/Photo.js   (MODEL)
 * -------------------------------------------------------------
 * A listing photo stored INSIDE MongoDB as binary data.
 *
 * Why not save image files on the server's disk?
 *   Render's free servers have a temporary disk that's wiped on every
 *   redeploy, so photos would disappear. Storing them in MongoDB Atlas keeps
 *   them as long as the listing exists, with no extra cloud service.
 *   Photos are limited to 2 MB each (see middleware/upload.js), well under
 *   MongoDB's 16 MB document limit.
 */
const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },          // the image bytes
    contentType: { type: String, required: true },   // 'image/jpeg' | 'image/png' | 'image/webp'
    size: { type: Number, required: true },          // bytes
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Photo', photoSchema);
