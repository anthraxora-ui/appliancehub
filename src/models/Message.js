/**
 * src/models/Message.js   (MODEL)
 * -------------------------------------------------------------
 * One message inside a Conversation.
 */
const mongoose = require('mongoose');

const MAX_MESSAGE_LENGTH = 1000;

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: {
      type: String,
      required: [true, 'Message cannot be empty.'],
      trim: true,
      maxlength: [MAX_MESSAGE_LENGTH, `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`],
    },
  },
  { timestamps: true }
);

// Loading a thread = all messages of one conversation in time order.
messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
module.exports.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;
