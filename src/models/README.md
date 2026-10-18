# Models (MVC Model Layer)

Each file defines a Mongoose model representing the domain schema, validation rules, and database queries. Controllers interact with MongoDB exclusively through these models.

| Model File | Responsibility | Owner |
|---|---|---|
| `User.js` | User accounts, password hashing, Buyer/Seller roles, seller rating state | Ilyan |
| `Listing.js` | Appliance listings, pricing, availability status lifecycle, spec map | Jaspreet |
| `Photo.js` | Binary image storage and MIME type metadata for appliance listings | Jaspreet |
| `Conversation.js`, `Message.js` | Buyer-seller chat threads and individual message records | Jayant |
| `PurchaseRequest.js` | Purchase offers, negotiation state transitions, transaction history | Jayant |
| `Notification.js` | In-app notification records created by Observer event handlers | Jayant |
| `Review.js` | Buyer star ratings (1–5) and comments for completed purchases | Anu |
