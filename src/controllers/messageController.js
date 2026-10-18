/**
 * src/controllers/messageController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * In-app messaging between a buyer and a seller about a listing.
 *
 *   GET  /messages               inbox (all my conversations)
 *   GET  /messages/new?listing=  buyer: write the first message
 *   POST /messages               buyer: create the conversation + first message
 *   POST /messages/from-request/:id  seller: open the chat with a requesting buyer
 *   GET  /messages/:id           one conversation (marks it as read)
 *   POST /messages/:id           reply
 *   GET  /messages/:id/poll      JSON: new messages since a time (auto-refresh)
 *
 * Privacy: only the two participants can open a conversation (403 otherwise).
 */
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { MAX_MESSAGE_LENGTH } = require('../models/Message');
const Listing = require('../models/Listing');
const PurchaseRequest = require('../models/PurchaseRequest');
const { httpError } = require('../middleware/errorHandler');
const events = require('../patterns/observer/marketplaceEvents');

// =================================================================
// Helpers
// =================================================================

/** Returns an error message, or null if the text is a valid message. */
function validateBody(text) {
  if (!text) return 'Message cannot be empty.';
  if (text.length > MAX_MESSAGE_LENGTH) {
    return `Message is too long (${text.length}/${MAX_MESSAGE_LENGTH} characters).`;
  }
  return null;
}

/**
 * Finds the conversation for (listing, buyer) or creates it.
 * Done in ONE atomic database operation (upsert), so two clicks at the same
 * moment can't create two conversations (the unique index backs this up).
 */
function findOrCreateConversation(listing, buyerId) {
  return Conversation.findOneAndUpdate(
    { listing: listing._id, buyer: buyerId },
    { $setOnInsert: { listing: listing._id, buyer: buyerId, seller: listing.seller } },
    { upsert: true, new: true }
  );
}

/**
 * Saves a message and updates the conversation summary:
 * latest preview + time, and +1 unread for the OTHER participant.
 */
async function addMessage(conversation, sender, body) {
  const message = await Message.create({ conversation: conversation._id, sender: sender._id, body });

  const side = conversation.sideOf(sender._id);
  const otherUnread = side === 'buyer' ? 'sellerUnread' : 'buyerUnread';
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: { lastMessageAt: message.createdAt, lastMessagePreview: body.slice(0, 120) },
      $inc: { [otherUnread]: 1 },
    }
  );

  // OBSERVER: announce the event; subscribers (notifications) react to it.
  await events.publish('message.sent', {
    conversationId: conversation._id,
    recipientId: side === 'buyer' ? conversation.seller : conversation.buyer,
    senderName: sender.name,
    preview: body.slice(0, 80),
  });
  return message;
}

/** Loads a conversation the current user takes part in (404 / 403 otherwise). */
async function loadConversation(req) {
  const conversation = await Conversation.findById(req.params.id)
    .populate('listing', 'title price photos category status')
    .populate('buyer', 'name')
    .populate('seller', 'name');
  if (!conversation) throw httpError(404, 'This conversation does not exist.');

  const side = conversation.sideOf(req.user._id);
  if (!side) throw httpError(403, 'You are not part of this conversation.');
  return { conversation, side };
}

/** Renders a conversation page (also used to re-show it after an error). */
async function renderThread(res, { conversation, side, errors = [], draft = '', status = 200 }) {
  const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 }).lean();
  res.status(status).render('pages/messages/thread', {
    title: `Chat: ${conversation.listing.title}`,
    conversation,
    side,
    other: side === 'buyer' ? conversation.seller : conversation.buyer,
    messages,
    errors,
    draft,
    maxLength: MAX_MESSAGE_LENGTH,
  });
}

// =================================================================
// Actions
// =================================================================

/** GET /messages  -  inbox, most recent conversation first. */
async function inbox(req, res) {
  const me = req.user._id;
  const conversations = await Conversation.find({ $or: [{ buyer: me }, { seller: me }] })
    .sort({ lastMessageAt: -1 })
    .populate('listing', 'title photos category status')
    .populate('buyer', 'name')
    .populate('seller', 'name')
    .lean();

  // Shape each row from MY point of view (who is the other person, my unread count).
  const rows = conversations.map((c) => {
    const iAmBuyer = String(c.buyer._id) === String(me);
    return {
      ...c,
      other: iAmBuyer ? c.seller : c.buyer,
      unread: iAmBuyer ? c.buyerUnread : c.sellerUnread,
    };
  });

  res.render('pages/messages/inbox', { title: 'Messages', rows });
}

/** GET /messages/new?listing=ID  -  buyer starts a conversation. */
async function showNew(req, res) {
  const listing = await Listing.findById(req.query.listing).populate('seller', 'name').lean();
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');

  // Already talking about this item? Continue that conversation instead.
  const existing = await Conversation.findOne({ listing: listing._id, buyer: req.user._id }).select('_id').lean();
  if (existing) return res.redirect(`/messages/${existing._id}`);

  res.render('pages/messages/new', { title: 'Message seller', listing, errors: [], draft: '', maxLength: MAX_MESSAGE_LENGTH });
}

/** POST /messages  -  create the conversation with its first message. */
async function start(req, res) {
  const body = String((req.body && req.body.body) || '').trim();
  const listing = await Listing.findById(req.body && req.body.listing).populate('seller', 'name').lean();
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');

  const error = validateBody(body);
  if (error) {
    return res.status(400).render('pages/messages/new', {
      title: 'Message seller', listing, errors: [error], draft: body, maxLength: MAX_MESSAGE_LENGTH,
    });
  }

  const conversation = await findOrCreateConversation({ ...listing, seller: listing.seller._id }, req.user._id);
  await addMessage(conversation, req.user, body);
  res.redirect(`/messages/${conversation._id}`);
}

/** POST /messages/from-request/:id  -  seller opens the chat with a buyer who sent a request. */
async function fromRequest(req, res) {
  const request = await PurchaseRequest.findById(req.params.id).lean();
  if (!request) throw httpError(404, 'This request does not exist.');
  if (String(request.seller) !== String(req.user._id)) throw httpError(403, 'This is not your request.');

  const conversation = await findOrCreateConversation(
    { _id: request.listing, seller: request.seller },
    request.buyer
  );
  res.redirect(`/messages/${conversation._id}`);
}

/** GET /messages/:id  -  show the conversation and mark it as read. */
async function thread(req, res) {
  const { conversation, side } = await loadConversation(req);
  await Conversation.updateOne({ _id: conversation._id }, { $set: { [`${side}Unread`]: 0 } });
  await renderThread(res, { conversation, side });
}

/** POST /messages/:id  -  send a reply. */
async function reply(req, res) {
  const { conversation, side } = await loadConversation(req);
  const body = String((req.body && req.body.body) || '').trim();

  const error = validateBody(body);
  if (error) {
    // Robustness: keep the typed text so nothing is lost.
    return renderThread(res, { conversation, side, errors: [error], draft: body, status: 400 });
  }

  await addMessage(conversation, req.user, body);
  res.redirect(`/messages/${conversation._id}#latest`);
}

/**
 * GET /messages/:id/poll?after=ISO-date  -  JSON for auto-refresh.
 * The open chat page calls this every few seconds to show new messages
 * without reloading.
 */
async function poll(req, res) {
  const { conversation, side } = await loadConversation(req);
  const after = new Date(req.query.after);
  const since = Number.isNaN(after.getTime()) ? new Date(0) : after;

  const messages = await Message.find({ conversation: conversation._id, createdAt: { $gt: since } })
    .sort({ createdAt: 1 })
    .lean();
  if (messages.length) {
    await Conversation.updateOne({ _id: conversation._id }, { $set: { [`${side}Unread`]: 0 } });
  }

  res.json(messages.map((m) => ({
    id: m._id,
    body: m.body,
    mine: String(m.sender) === String(req.user._id),
    createdAt: m.createdAt,
  })));
}

module.exports = { inbox, showNew, start, fromRequest, thread, reply, poll, validateBody };
