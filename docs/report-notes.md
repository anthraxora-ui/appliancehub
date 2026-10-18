# ApplianceHub — Software Requirements, Architecture & Verification Specification

**Project Title:** ApplianceHub: Home Appliance Marketplace  
**Course:** CS 476 — Software Development and Demonstration  
**Team Members:** Ilyan · Jaspreet · Anu · Jayant  

---

## 1. Problem Definition

### Application Domain & Context
Purchasing or selling major household appliances—such as refrigerators, washing machines, dryers, ovens, dishwashers, and air conditioners—presents unique challenges in the secondary and local retail markets. Unlike small consumer goods, home appliances are high-value, bulky items defined by strict technical parameters: physical dimensions, storage capacity in litres or kilograms, electrical or gas fuel requirements, cooling output in BTUs, noise levels in decibels, and Energy Star certifications.

### Problem Statement & Motivation
When individuals move, renovate, or upgrade their homes, functional appliances are frequently discarded or sold through general-purpose classified boards. However, general classified platforms treat a refrigerator identically to a piece of furniture or clothing—offering only a free-text description box and a price field. As a result:
1. **Buyers** waste hours messaging sellers to ask basic technical questions (e.g., whether a stove is gas or electric, whether a washer is front-load or top-load, or the capacity of a fridge) and cannot compare multiple appliances side by side.
2. **Sellers** struggle to present structured specifications, manage competing purchase offers without double-booking, or build verifiable reputation profiles.
3. **Transactions** lack state-machine enforcement, leading to miscommunication over whether an appliance is still available, reserved (pending pickup), or already sold.

**ApplianceHub** solves this problem by providing a dedicated, role-based web marketplace tailored specifically to home appliances, featuring category-specific specification schemas, polymorphic validation via the **Simple Factory** pattern, real-time transaction and watchlist alerts via the **Observer** pattern, side-by-side technical comparison, and atomic purchase reservation.

---

## 2. Application Benefits: Comparison with Existing Systems

To evaluate the advantages of ApplianceHub, we compare it against two widely used existing platforms in Canada:

1. **Facebook Marketplace** — [https://www.facebook.com/marketplace](https://www.facebook.com/marketplace)
2. **Kijiji Canada** — [https://www.kijiji.ca](https://www.kijiji.ca)

### Comparative Feature Matrix

| Feature / Capability | Facebook Marketplace | Kijiji Canada | ApplianceHub (Our System) |
|---|---|---|---|
| **Appliance-Specific Technical Fields** | ❌ Generic title/description only; no structured BTU, capacity (L/kg), noise (dB), or fuel fields | ⚠️ Basic brand/condition tags; lacks category-specific technical attributes | ✅ **Dynamic per-category spec fields** generated and validated by `ApplianceFactory` |
| **Domain-Specific Validation Rules** | ❌ None (allows invalid entries, e.g., freezer volume larger than total volume) | ❌ None (no cross-field technical validation) | ✅ **Polymorphic validation** (e.g., rejects wall ovens with stovetop burners or freezer > total capacity) |
| **Side-by-Side Technical Comparison** | ❌ Not supported | ❌ Not supported | ✅ **Up to 3 appliances compared side-by-side** with aligned specification rows and lowest-price highlighting |
| **Structured Purchase Request & Offer Workflow** | ❌ Informal chat messages only; no formal offer state tracking | ❌ Informal chat/email only | ✅ **Formal state machine** (`Pending` → `Accepted` → `Completed` / `Rejected` / `Cancelled`) |
| **Atomic Reservation (Anti-Double-Selling)** | ❌ Seller manually marks "Pending"; race conditions common | ❌ Manual listing removal | ✅ **Atomic database transition** reserves the listing and auto-declines competing pending requests |
| **Saved-Item Status Alerts** | ⚠️ Occasional generic notifications | ⚠️ Basic price-drop email alerts | ✅ **Real-time Observer alerts** (`FavoriteWatcherObserver`) when a saved item is reserved, sold, or re-opened |
| **Verified Post-Sale Seller Ratings** | ⚠️ Users can rate after chatting even if no sale occurred | ⚠️ Similar chat-based review trigger | ✅ **Strictly tied to completed sales**: only the buyer of a `completed` purchase request can submit one 1–5★ review |
| **Dedicated Role Dashboards** | ❌ Mixed feed interface | ❌ Unified account menu | ✅ **Distinct Buyer & Seller roles** with role-specific dashboards, histories, and access control |

### Key Benefits Over Existing Systems
- **Structured Data Integrity:** By enforcing category schemas at creation time, buyers immediately see verified units (`L`, `kg`, `RPM`, `W`, `BTU`, `dB`, `sq ft`) rather than parsing unstructured paragraphs.
- **Decision Support via Comparison:** Buyers can place up to three candidate appliances into a comparison matrix that automatically highlights the best price and aligns technical specifications row by row.
- **Transaction Safety:** Accepting a buyer's offer atomically transitions the listing to `pending` and notifies all other interested parties through the Observer pattern, eliminating the frustration of showing up to buy an item that was promised to someone else.

---

## 3. Requirements Elicitation

### 3(a) Implemented Functional Requirements by User Role

#### Role 1: Buyer (12 Functional Requirements)
| ID | Requirement Name | Explanation |
|---|---|---|
| **FR-B1** | **Buyer Registration & Authentication** | Create a Buyer account with name, email, city, and password; log in and out securely with persistent session cookies. |
| **FR-B2** | **Manage Buyer Profile** | Update personal profile details (name, phone, city, bio) and change account password while preserving role immutability. |
| **FR-B3** | **Buyer Dashboard** | View personalized buyer overview displaying saved favorites count, active purchase requests, unread messages, and quick actions. |
| **FR-B4** | **Browse & View Listing Details** | Browse available appliances and inspect full listing pages with multi-photo galleries, formatted technical specs, condition, city, and seller rating cards. |
| **FR-B5** | **Multi-Criteria Search & Filtering** | Search listings by keyword, category, brand, min/max price range, multiple condition checkboxes, and city with pagination (12 per page). |
| **FR-B6** | **Sort Search Results** | Order matching appliance listings by newest first, price low-to-high, or price high-to-low. |
| **FR-B7** | **Compare Appliances Side-by-Side** | Add up to 3 listings to a comparison table that aligns price, condition, seller rating, and category-specific technical specs, highlighting the lowest price. |
| **FR-B8** | **Save & Manage Favorites** | Bookmark or remove listings in a personal Favorites list; automatically hides removed listings. |
| **FR-B9** | **Contact Seller (In-App Messaging)** | Start or continue a listing-specific conversation thread with a seller, featuring unread indicators and 5-second live polling. |
| **FR-B10** | **Send & Cancel Purchase Requests** | Submit a formal purchase offer (asking price or custom offer) with an optional note, and cancel pending or accepted requests if plans change. |
| **FR-B11** | **View Purchase History & Notifications** | Track completed appliance purchases with total expenditure and receive real-time Observer notifications (accepted/declined offers, saved-item status changes). |
| **FR-B12** | **Rate & Review Sellers** | Submit a 1–5 star rating and written review for a seller after a purchase request reaches `completed` status (limited to one review per transaction). |

#### Role 2: Seller (12 Functional Requirements)
| ID | Requirement Name | Explanation |
|---|---|---|
| **FR-S1** | **Seller Registration & Authentication** | Register a Seller account, authenticate via bcrypt-verified credentials, and maintain a role-protected session. |
| **FR-S2** | **Manage Seller & Public Profile** | Edit seller contact details and bio; expose a public profile displaying member-since date, aggregate star rating, rating distribution, active listings, and buyer reviews. |
| **FR-S3** | **Seller Dashboard** | View key seller metrics: total listings by status (Available, Pending, Sold), incoming pending purchase requests, unread chats, and completed sales revenue. |
| **FR-S4** | **Create Dynamic Appliance Listing** | Select an appliance category to dynamically render category-specific spec inputs (via Simple Factory), upload 1–5 photos, and publish a validated listing with auto-generated or custom title. |
| **FR-S5** | **Edit Listing & Manage Photos** | Modify listing price, description, condition, and technical specs; add new photos or delete existing ones while enforcing the 1–5 photo rule. |
| **FR-S6** | **Remove Listing (Soft Delete)** | Remove a listing from public search while preserving its database record so historical purchase/sales logs remain intact, automatically cancelling open requests. |
| **FR-S7** | **Manage Multiple Listings Inventory** | Filter personal inventory by status tabs (`All`, `Available`, `Pending`, `Sold`), track view counts per listing, and perform quick actions. |
| **FR-S8** | **Update Listing Availability Status** | Manually transition unreserved listings between `Available`, `Pending`, and `Sold`, triggering Observer notifications to watchers. |
| **FR-S9** | **Receive & Reply to Buyer Messages** | Manage an inbox of buyer inquiries sorted by most recent activity with unread badges and live thread updates. |
| **FR-S10** | **Accept or Reject Purchase Requests** | Accept a buyer's offer (atomically reserving the listing as `pending` and declining competing offers) or reject it with an explanatory note. |
| **FR-S11** | **Complete Sale or Release Reservation** | Finalize an accepted request as `completed` (marking the listing `sold`) or release the reservation if the deal falls through (returning the listing to `available`). |
| **FR-S12** | **View Sales History & Reputation Alerts** | Review a chronological ledger of completed sales with total revenue earned, and receive Observer notifications for new offers, messages, and buyer reviews. |

---

### 3(b) Software Qualities: 12 Concrete Examples Across Distinct Use Cases

Every example below uses a **different use case** (6 Buyer examples + 6 Seller examples = 12 unique use cases total).

#### Buyer Role — Software Quality Examples

| Quality | Use Case (Unique) | Concrete Implementation & Behavior in ApplianceHub |
|---|---|---|
| **Correctness #1** | **Edit Buyer Profile** | When a buyer submits `POST /profile`, the controller whitelists only `name`, `phone`, `city`, and `bio`. Even if a user tampers with the HTTP payload to inject `role=seller` or `ratingAverage=5`, the account remains a Buyer and protected fields are untouched. |
| **Correctness #2** | **Rate & Review Seller** | When a buyer submits a review (`POST /reviews`), `Review.recalculateSellerRating()` runs a MongoDB `$group` aggregation over all stored reviews for that seller rather than computing an incremental running average, guaranteeing exact rounding to 1 decimal place and preventing duplicate reviews via a unique index on `purchaseRequest`. |
| **Robustness #1** | **Buyer Registration** | Submitting a 1-character name, malformed email (`not-an-email`), and mismatched 3-character passwords does not crash the server or create a partial user; all validation errors are presented together while preserving the user's typed fields. |
| **Robustness #2** | **Multi-Criteria Search** | If a buyer enters inverted price bounds (`minPrice=900`, `maxPrice=100`), negative numbers, non-numeric text, or regex metacharacters like `(+*` in the keyword box, `searchController` escapes regex characters, swaps inverted bounds automatically, and displays a helpful notice (`"Minimum price was higher than maximum, so we swapped them ($100 – $900)"`). |
| **Time-Efficiency #1** | **Browse & Filter Listings** | Compound MongoDB indexes on `{ status: 1, category: 1, createdAt: -1 }` and `{ status: 1, price: 1 }` combined with pagination (`limit(12)`) allow complex multi-filter searches across 1,000 listings to complete in **8–18 ms** (well under the 2,000 ms threshold). |
| **Time-Efficiency #2** | **Compare Appliances** | `compareController` fetches all selected listings (up to 3) in a **single batched query** (`Listing.find({ _id: { $in: ids } })`) and formats specification rows in memory through `ApplianceFactory`, rendering the comparison matrix in under 10 ms. |

#### Seller Role — Software Quality Examples

| Quality | Use Case (Unique) | Concrete Implementation & Behavior in ApplianceHub |
|---|---|---|
| **Correctness #1** | **Accept Purchase Request** | `requestController.accept` reserves the appliance using a single atomic operation (`Listing.findOneAndUpdate({ _id, status: 'available' }, { status: 'pending' })`). If two requests are accepted concurrently, only the first succeeds; competing pending requests are automatically declined with a clear reason. |
| **Correctness #2** | **Update Listing Availability** | Only the listing owner can change its status (`listing.seller.equals(req.user._id)`—otherwise HTTP 403 is returned), and manually changing a listing that has an active accepted purchase request is blocked so the buyer's reservation cannot be accidentally overwritten. |
| **Robustness #1** | **Seller Login** | After 5 consecutive failed password attempts for an email address, the rate limiter blocks further login attempts for 5 minutes with HTTP 429 (`"Too many failed login attempts"`), protecting seller accounts against brute-force guessing without crashing or leaking whether the email exists. |
| **Robustness #2** | **Create Appliance Listing** | Uploading a text or executable file renamed to `fake.jpg` or an image exceeding 2 MB is caught by `upload.js`, which inspects the binary magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`). The invalid file is rejected with a clear message and all typed form specifications are retained. |
| **Time-Efficiency #1** | **Manage Seller Listings (`mine`)** | Instead of issuing four separate `countDocuments()` queries for the status tabs (`All`, `Available`, `Pending`, `Sold`), `listingController.mine` fetches the seller's listings once using the indexed `seller` field and computes all tab totals in a single $O(N)$ pass. |
| **Time-Efficiency #2** | **In-App Messaging & Notifications** | Rapid chat replies within the same conversation are coalesced by `NotificationObserver` via an atomic upsert on `{ user, type: 'message.sent', link, read: false }`, and the header unread badge queries a compound index `{ user: 1, read: 1 }`, keeping polling requests under 5 ms. |

---

## 4. Functional Requirements Specification (UML Models)

### 4(a) Use Case Overview by Actor
- **Visitor (Unauthenticated):** Browse Home Page, Search & Filter Listings, View Listing Details, View Public Seller Profile, Register Account, Log In.
- **Buyer (inherits Registered User):** Log Out, Edit Profile, Change Password, View Buyer Dashboard, Compare Appliances, Save/Remove Favorites, Contact Seller (Send/Read Messages), Send Purchase Request, Cancel Purchase Request, View Purchase History, Rate & Review Seller, View Notifications.
- **Seller (inherits Registered User):** Log Out, Edit Profile, Change Password, View Seller Dashboard, Create Listing («include» Validate Specs via Simple Factory), Edit Listing, Remove Listing, Update Listing Availability, Manage Listings Inventory, Reply to Messages, Accept Purchase Request («include» Notify Observers), Reject Purchase Request, Complete Sale, Release Reservation, View Sales History, View Notifications.

### 4(b) Detailed Activity Flows for Complex Use Cases

#### Complex Use Case 1: Create Appliance Listing (Seller)
1. Seller navigates to **Sell an Appliance** (`GET /listings/new`).
2. **Authentication check («include» Log In):** If not authenticated as a Seller, redirect to `/login`.
3. Seller selects an appliance category (e.g., `Refrigerator`).
4. Browser requests `GET /api/categories/refrigerator/fields`; `CategoryController` queries `ApplianceFactory` and returns the category's specification schema (`style`, `capacityLiters`, `freezerLiters`, `energyStar`).
5. Seller fills in brand, model, condition, price, city, category specs, and attaches 1–5 photo files, then submits (`POST /listings`).
6. **Decision — Photo Upload Validation:**
   - *Invalid MIME / magic bytes or size > 2 MB or count < 1 or > 5:* Return to form with upload error message and preserve all entered fields.
7. `ListingController` invokes `ApplianceFactory.createAppliance(category, body)` and calls polymorphic `appliance.validate()`.
8. **Decision — Domain & Category Spec Validation:**
   - *Errors returned (e.g., `freezerLiters > capacityLiters`):* Return to form displaying all validation errors and preserve entered fields.
9. If title was left blank, generate default title via `appliance.getSummary()`.
10. Persist uploaded binary images as `Photo` documents and create the `Listing` document in MongoDB.
11. Redirect Seller to the newly published listing detail page (`GET /listings/:id`).

#### Complex Use Case 2: Accept Purchase Request & Complete Sale (Seller)
1. Seller opens **Purchase Requests** (`GET /requests/received`) and selects a `pending` request.
2. Seller clicks **Accept** (`POST /requests/:id/accept`).
3. **Decision — Request State Check:**
   - *Request is no longer `pending`:* Display error notice and abort.
4. **Decision — Atomic Listing Reservation:**
   - Execute `Listing.findOneAndUpdate({ _id: listingId, status: 'available' }, { status: 'pending' })`.
   - *If null (already reserved/sold):* Display error notice and abort.
5. Update accepted request status to `accepted`.
6. **Parallel Fork (Observer Pattern Broadcast):**
   - **Branch A:** Find all other `pending` requests for the same listing, set their status to `rejected` with note `"The item was reserved for another buyer"`, and publish `request.rejected` for each.
   - **Branch B:** Publish `request.accepted` → `NotificationObserver` creates an alert for the winning buyer; `ActivityLogObserver` records the event.
   - **Branch C:** Publish `listing.statusChanged` (`status: 'pending'`) → `FavoriteWatcherObserver` notifies all other users who bookmarked the listing.
7. **Join** parallel branches and redirect Seller with confirmation flash message.
8. Later, after physical pickup, Seller clicks **Mark Sale Completed** (`POST /requests/:id/complete`), transitioning request to `completed`, listing to `sold`, and publishing `request.completed` (inviting the buyer to submit a review) and `listing.statusChanged` (`status: 'sold'`).

---

## 5. Software Design: MVC Architecture

### MVC Mapping in Express
| MVC Component | Directory | Architectural Role in ApplianceHub |
|---|---|---|
| **Model (M)** | `src/models/` | Mongoose schemas (`User`, `Listing`, `Photo`, `Conversation`, `Message`, `PurchaseRequest`, `Review`, `Notification`) encapsulating data types, indexes, state transitions, and persistence logic. |
| **View (V)** | `src/views/` | Server-rendered EJS templates (`pages/` and reusable `partials/`) responsible strictly for HTML presentation without database queries or business rules. |
| **Controller (C)** | `src/controllers/` | Request handlers (`authController`, `listingController`, `searchController`, `compareController`, `favoriteController`, `messageController`, `requestController`, `reviewController`, `notificationController`, `profileController`, `categoryController`, `homeController`) coordinating models, design patterns, and view selection. |
| **Router** | `src/routes/` | Declarative Express routers mapping HTTP verbs and URL paths to controller actions and role-protection middleware. |

### Three Key Benefits of MVC for ApplianceHub
1. **Parallel Development & Maintainability:** Each of the four team members worked on distinct controllers, models, and views simultaneously without merge conflicts (e.g., Jaspreet developed `listingController` and `ApplianceFactory` while Anu developed `searchController` and `compareController`).
2. **Code Reuse Across User Roles:** The same `Listing` model and `ApplianceFactory` products power the seller's listing creation form, the buyer's search page, the listing detail view, and the side-by-side comparison table. Shared EJS partials (`header.ejs`, `footer.ejs`, `listing-card.ejs`) ensure visual consistency across all 20+ pages.
3. **Centralized Validation & Testability:** Domain rules reside in models and pattern classes rather than inside HTML templates, allowing all 35 unit and integration tests (`test/*.test.js`) to verify business logic directly without requiring a browser.

---

## 6. Deployment Architecture

| Node / Environment | Technology & Artifacts |
|---|---|
| **Client Device** (Desktop PC / Mobile Phone) | **Web Browser Execution Environment:** Chrome, Edge, Firefox, Safari. Runs HTML5, CSS3, and client scripts (`main.js`, `listing-form.js`, `chat.js`). Communicates with server over **HTTPS (TLS, port 443)**. |
| **Application & Web Server** (Render Cloud Container) | **Node.js 20+ Runtime Environment:** Hosts the **ApplianceHub Express 5 Application** (`server.js`, routes, controllers, EJS views, Mongoose models, Simple Factory, Observer). Exposes `/health` endpoint for automated container monitoring. |
| **Cloud Database Cluster** (MongoDB Atlas on AWS) | **MongoDB 8 Replica Set:** Connected over encrypted **TLS (`mongodb+srv://`, port 27017)**. Stores 9 collections: `users`, `listings`, `photos`, `conversations`, `messages`, `purchaserequests`, `notifications`, `reviews`, and `sessions`. |

---

## 7. Technical Documentation

### 7(a) Programming Languages
- **JavaScript (ES2022 / Node.js):** Server-side business logic, MVC controllers, Mongoose models, design patterns, test suites, and client-side DOM enhancements.
- **HTML5 (via EJS Templates):** Semantic document structure and forms.
- **CSS3:** Custom responsive layout using CSS Grid, Flexbox, and CSS custom properties (`public/css/style.css`).

### 7(b) Reused Libraries, Algorithms & Assets
| Item | Source / Reference | Usage in ApplianceHub |
|---|---|---|
| **bcrypt Password Hashing** | `bcryptjs` — [https://www.npmjs.com/package/bcryptjs](https://www.npmjs.com/package/bcryptjs) | Salted password hashing (cost factor 10) in `src/models/User.js` |
| **Regular Expression Escaping** | MDN Web Docs — [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping) | Escaping user search keywords (`/[.*+?^${}()|[\]\\]/g`) in `searchController.js` |
| **Image Magic-Byte Signatures** | Wikipedia List of File Signatures — [https://en.wikipedia.org/wiki/List_of_file_signatures](https://en.wikipedia.org/wiki/List_of_file_signatures) | Binary header verification for JPEG, PNG, GIF, and WebP in `src/middleware/upload.js` |
| **Brand & Category Visual Assets** | Designed by the project team using **Figma** and **Canva**; demo appliance photos curated from royalty-free product catalogues | `public/images/` and `design/listing-photos/` |

### 7(c) Software Tools & Environments
| Tool / Environment | Specific Benefit for ApplianceHub |
|---|---|
| **Node.js (v20+) & npm** | Unified JavaScript runtime across server and browser; built-in `node:test` runner and `perf_hooks` timing API. |
| **Express 5** | Lightweight routing and middleware pipeline that maps cleanly onto the MVC architecture and centralized error handling. |
| **MongoDB Atlas & Mongoose 8** | Document model naturally accommodates both shared listing attributes and category-specific `specs` maps while providing schema validation and compound indexing. |
| **mongodb-memory-server** | Spins up an isolated, zero-configuration in-memory MongoDB instance for local development, integration tests, and the 1,000-listing benchmark. |
| **EJS (Embedded JavaScript)** | Fast server-side HTML rendering with partial template reuse and automatic HTML escaping against XSS. |
| **Multer** | Parses `multipart/form-data` requests into memory buffers so uploaded appliance photos can be validated and stored in MongoDB. |
| **Morgan** | Logs HTTP method, URL, status code, and response time in milliseconds for real-time performance monitoring. |
| **Git & GitHub** | Distributed version control tracking task-level commits (`[T01]`–`[T13]`) across all four team members. |
| **Render** | Cloud PaaS providing continuous deployment from GitHub via `render.yaml`, managed HTTPS, and automated `/health` checks. |

---

## 8. Acceptance Testing Specification

In compliance with course testing rules, **every test case below evaluates a distinct use case** (no use case is repeated across Correctness, Robustness, or Time-Efficiency testing).

### 8(a) Correctness Testing (4 Distinct Use Cases)

| Test ID | Use Case | Test Input | Expected & Verified Output | Status |
|---|---|---|---|---|
| **C1** | **Edit Buyer Profile** | Logged in as Buyer (`bella@demo.ca`), change city to `"Moose Jaw"` and inject `role="seller"` in POST body. | City updates to `"Moose Jaw"`, flash message confirms save, and user role remains **`Buyer`** (`role` injection ignored). | PASS |
| **C2** | **Compare Appliances** | Add 2 refrigerators (`Samsung $1,450` and `Whirlpool $480`) to comparison and open `/compare`. | Both appliances render side-by-side; `$480.00` displays the **`Lowest`** badge; refrigerator-specific rows (`Style`, `Total capacity`, `Freezer capacity`, `Energy Star`) align accurately. | PASS |
| **C3** | **Accept Purchase Request** | With 2 pending requests on `LG Front Load Washing Machine` (from Ben and Bella), Seller Sam clicks **Accept** on Ben's request. | Ben's request becomes **`Accepted`**; Bella's request automatically becomes **`Rejected`** (`"The item was reserved for another buyer"`); listing status becomes **`Pending`**. | PASS |
| **C4** | **Rate & Review Seller** | Buyer Bella opens her completed microwave purchase and submits a **4★** rating with comment `"Works great, clean pickup"`. | Review is saved; Sam's public seller profile updates to **4.0★ (1 review)**; Sam receives an unread Observer notification (`"Bella Buyer left you a 4★ review"`). | PASS |

### 8(b) Robustness Testing (4 Distinct Use Cases)

| Test ID | Use Case | Test Input | Expected & Verified Output | Status |
|---|---|---|---|---|
| **R1** | **User Registration** | Submit registration form with name `"A"`, email `"not-an-email"`, password `"abc"`, confirm `"xyz"`. | Server returns HTTP 400 with all 4 validation errors listed clearly; typed name and email remain filled in the form; no user record is created. | PASS |
| **R2** | **User Login (Rate Limit)** | Submit 6 consecutive login attempts for `sam@demo.ca` with an incorrect password. | Attempts 1–5 show `"Incorrect email or password."` Attempt 6 returns HTTP 429: `"Too many failed login attempts. Please wait 5 minutes and try again."` | PASS |
| **R3** | **Create Listing (Invalid File)** | Seller fills listing form and uploads a plain text file renamed to `fake.jpg` as the appliance photo. | Magic-byte check rejects the upload with `"fake.jpg is not a valid image file (use JPEG, PNG, GIF or WebP)"`; all typed form fields remain intact. | PASS |
| **R4** | **Send Message (Length Limit)** | Buyer submits a message containing 1,001 characters in a conversation thread. | Server rejects the message with `"Message is too long (1001/1000 characters)"`, preserves the typed text in the textarea so the user can shorten it, and does not save a truncated message. | PASS |

### 8(c) Time-Efficiency Testing (2 Distinct Functions)

#### Function 1: Multi-Filter Buyer Search (`searchController.index`)
- **Measurement Method:**
  1. **Automated HTTP Benchmark (`scripts/benchmark-search.js`):** Seeds 1,000 appliance listings into an isolated database, sends 20 HTTP requests per search scenario, and records end-to-end execution time using Node's high-resolution timer `performance.now()`.
  2. **In-Controller Query Timer:** `searchController.js` measures database execution time with `Date.now() - startTime` and prints `"Found X appliances in Y ms"` directly on the `/listings` results banner.
- **Measured Results (1,000 Listings, 20 Runs Each):**

| Search Scenario | Avg (ms) | p95 (ms) | Max (ms) | Threshold (< 2000 ms) |
|---|---:|---:|---:|---|
| Browse all (page 1) | 16.4 | 18.5 | 23.9 | **PASS** |
| Keyword `"samsung"` | 17.7 | 18.4 | 18.5 | **PASS** |
| Category + price range + sort | 13.8 | 15.0 | 15.1 | **PASS** |
| All filters combined | 8.9 | 9.6 | 9.6 | **PASS** |
| Page 10 of results | 14.6 | 16.0 | 18.4 | **PASS** |

#### Function 2: Seller Inventory Dashboard & Status Aggregation (`listingController.mine`)
- **Measurement Method:** Measured using the **Morgan HTTP response-time logger** (`:method :url :status - :response-time ms`) and `performance.now()` while loading `GET /listings/mine` for a seller owning multiple listings across `Available`, `Pending`, and `Sold` states.
- **Measured Results:** Single indexed query (`Listing.find({ seller: req.user._id, status: { $ne: 'removed' } })`) + in-memory status tab aggregation completes in **4.2 ms average** (well under the 2,000 ms threshold).
