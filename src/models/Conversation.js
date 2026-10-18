/**
 * src/models/Conversation.js   (MODEL)
 * -------------------------------------------------------------
 * One chat thread between ONE buyer and ONE seller about ONE listing.
 * The individual messages are in the Message model.
 *
 * Kept here so the inbox loads fast with a single query (no need to scan
 * every message): the latest message preview and unread counters.
 */
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: '', maxlength: 120 },

    // How many messages each side hasn't read yet.
    buyerUnread: { type: Number, default: 0, min: 0 },
    sellerUnread: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// A buyer has at most ONE conversation per listing (correctness),
// and the inbox query (by buyer or seller, newest first) uses an index.
conversationSchema.index({ listing: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1 });

/** 'buyer' | 'seller' | null: which side of the conversation a user is on. */
conversationSchema.methods.sideOf = function (userId) {
  const id = String(userId);
  const buyerId = String(this.buyer._id || this.buyer);
  const sellerId = String(this.seller._id || this.seller);
  if (id === buyerId) return 'buyer';
  if (id === sellerId) return 'seller';
  return null;
};

module.exports = mongoose.model('Conversation', conversationSchema);
