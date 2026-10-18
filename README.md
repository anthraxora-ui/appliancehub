# ApplianceHub: Home Appliance Marketplace

> **CS 476: Software Development and Demonstration**  
> Department of Computer Science, University of Regina  
> **Instructor:** Dr. Samira Sadaoui  
> **Team Members:** Ilyan · Jaspreet · Anu · Jayant  

---

## 1. Project Overview

ApplianceHub is a distributed, web-based marketplace engineered specifically for buying, selling, and comparing new and used home appliances within local communities. 

Generic classified platforms often lack structured appliance specifications (e.g., refrigerator capacity in litres, washing machine spin speeds, noise ratings, air conditioner BTU), making side-by-side comparison difficult and purchasing error-prone. ApplianceHub solves this by providing category-specific validation, structured specification sheets, and a dedicated negotiation workflow between two distinct user roles: **Buyers** and **Sellers**.

The system is constructed with a strict **Model-View-Controller (MVC)** architecture and implements two Gang of Four (GoF) design patterns from scratch: the **Simple Factory** pattern (creational) and the **Observer** pattern (behavioral).

---

## 2. Core Features by User Role

### For Buyers
- **Search & Multi-Attribute Filters:** Filter appliances simultaneously by category, brand, price range, condition (Brand New, Like New, Good, Fair), and city. Includes auto-correction if minimum price exceeds maximum.
- **Side-by-Side Comparison:** Compare up to 3 appliances concurrently across prices, dimensions, and category-specific technical specifications with dynamic unit formatting.
- **Saved Favorites:** Bookmark listings for quick access with automatic real-time alerts when prices change or items are reserved/sold.
- **In-App Messaging:** Communicate directly with sellers through an in-app chat thread with unread badges and periodic message polling.
- **Purchase Request Workflow:** Submit purchase offers (at asking price or a custom proposed amount) and track status updates (Pending, Accepted, Rejected, Completed).
- **Seller Reviews & Ratings:** Leave a 1–5 star review with comments after a completed purchase to build community trust.

### For Sellers
- **Dynamic Listing Management:** Category-driven listing forms that adapt their input fields and validation rules based on appliance type (e.g., burner counts for stoves, BTU for air conditioners).
- **Secure Photo Uploads:** Upload multiple appliance photos with server-side file-type validation (magic byte inspection) and size restrictions.
- **Availability State Machine:** Control listing lifecycle states (`Available` → `Pending` → `Sold`) with atomic locking to prevent race conditions or duplicate reservations.
- **Request Management:** Review incoming buyer purchase requests; accepting one automatically declines competing offers and marks the item reserved.
- **Seller Dashboard:** High-level summary of active listings, pending offers, sales revenue, and buyer feedback.
- **Public Reputation Profile:** Showcase verified member history, average rating, star distribution, and recent reviews.

---

## 3. Software Architecture & Design Patterns

```
server.js                 # Entry point: database connection & server bootstrap
src/
├── app.js                # Express application configuration & middleware setup
├── config/               # Environment variables, database connection, categories
├── controllers/          # Controller layer (C): HTTP request handling & business logic
├── middleware/           # Auth checks, role protection, error handling, file upload
├── models/               # Model layer (M): Mongoose schemas & data validation
├── patterns/
│   ├── factory/          # Simple Factory pattern: ApplianceFactory & 8 concrete products
│   └── observer/         # Observer pattern: Subject, EventSubject, & 3 concrete observers
├── routes/               # Routing layer: Maps URL endpoints to controllers
└── views/                # View layer (V): EJS templates and reusable partials
public/                   # Static assets: CSS stylesheets, client scripts, web images
scripts/                  # Performance benchmarks, database seeding, photo migration
test/                     # Automated unit and integration test suites
docs/                     # Architectural design documents and report documentation
```

### Simple Factory Pattern (GoF Creational)
- **Location:** `src/patterns/factory/`
- **Purpose:** Decouples listing controllers and form renderers from concrete appliance classes.
- **Structure:** `ApplianceFactory` instantiates concrete products (`Refrigerator`, `WashingMachine`, `Dryer`, `Microwave`, `Oven`, `Dishwasher`, `AirConditioner`, `OtherAppliance`) derived from an abstract `Appliance` base class.
- **Capabilities:** Polymorphic spec validation (e.g., ensuring refrigerator freezer volume does not exceed total capacity), dynamic form field schema generation, and technical specification formatting.

### Observer Pattern (GoF Behavioral)
- **Location:** `src/patterns/observer/`
- **Purpose:** Establishes a one-to-many dependency so that marketplace state changes notify dependent services without tight coupling.
- **Structure:** Implemented from scratch using the GoF **Pull model**. `MarketplaceEventSubject` publishes state changes across 8 system events.
- **Attached Observers:**
  - `NotificationObserver`: Dispatches in-app notifications to buyer/seller notification feeds.
  - `FavoriteWatcherObserver`: Automatically notifies users when a saved appliance changes status.
  - `ActivityLogObserver`: Maintains an in-memory chronological audit log of all marketplace operations.

---

## 4. Software Quality Implementation

| Quality | Concrete Implementation |
|---|---|
| **Correctness** | • Atomic reservations using MongoDB `findOneAndUpdate` to prevent double-selling.<br>• Exact seller average recalculation via aggregate pipelines across completed reviews.<br>• Immutability of account roles during profile modifications. |
| **Robustness** | • Upload security: validates real image byte headers rather than relying on file extensions.<br>• Input protection: auto-swaps inverted price bounds and sanitizes regex metacharacters.<br>• Resilient error handling: custom 404/500 templates, graceful server shutdown on DB failures. |
| **Time-Efficiency** | • Compound indexing on `(status, category, createdAt)` ensuring search latency stays < 20 ms.<br>• Image compression pipeline reducing raw asset payload from 76 MB to < 1.5 MB with `loading="lazy"`.<br>• Real-time notification badge counts computed via lightweight index lookups. |

---

## 5. Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Runtime** | Node.js (v20+) | Asynchronous server-side JavaScript environment |
| **Framework** | Express 5 | Web framework handling routing, middleware, and controllers |
| **View Engine** | EJS + HTML5 + CSS3 | Server-rendered templates with responsive styling |
| **Database** | MongoDB (v8) via Mongoose | Document database (Atlas in production, in-memory in dev) |
| **Testing** | Node.js Test Runner (`node:test`) | Native automated unit and integration testing suite |
| **Authentication** | express-session + bcryptjs | Cookie-based session authentication with bcrypt hashing |
| **Deployment** | Render | Cloud platform hosting web service and auto-deployment |

---

## 6. Getting Started Locally

### Prerequisites
- Node.js (v20.0.0 or higher)
- npm (v10.0.0 or higher)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anthraxora-ui/appliancehub.git
   cd appliancehub
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env

   # macOS / Linux:
   cp .env.example .env
   ```
   > *Note:* If `MONGODB_URI` in `.env` is left blank, the application automatically launches a zero-configuration, temporary **in-memory MongoDB database**. No manual database installation is required for local testing.

4. **Start the application:**
   ```bash
   # Development mode with auto-reload:
   npm run dev

   # Production mode:
   npm start
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 7. Testing & Performance Benchmarking

### Automated Test Suite
The project includes 35 comprehensive automated tests covering the Simple Factory, Observer notifications, search query builders, and review transactions:

```bash
npm test
```

### Search Performance Benchmark
An automated stress script simulates buyer queries against 1,000 generated appliance listings over HTTP to verify that search latencies satisfy course requirements (< 2,000 ms):

```bash
npm run benchmark
```

*Benchmark Output Sample:*
```
Search time-efficiency test: 1000 listings, 20 runs per search
Search                              avg ms  p95 ms  max ms  result
--------------------------------------------------------------------
Browse all (page 1)                   16.4    18.5    23.9  PASS
Keyword "samsung"                     17.7    18.4    18.5  PASS
Category + price range + sort         13.8    15.0    15.1  PASS
All filters combined                   8.9     9.6     9.6  PASS
Page 10 of results                    14.6    16.0    18.4  PASS
--------------------------------------------------------------------
Requirement: every search under 2000 ms -> PASSED
```

---

## 8. Task Assignments (CS 476)

| Task ID | Component Description | Primary Owner |
|:---:|---|:---:|
| **T01** | Project initialization, Express MVC skeleton, global error handling | **Ilyan** |
| **T02** | User authentication (registration/login/logout), session security, roles | **Ilyan** |
| **T03** | Simple Factory implementation: `ApplianceFactory` and 8 concrete products | **Jaspreet** |
| **T04** | Seller listing lifecycle: create, update, delete, photo upload, availability | **Jaspreet** |
| **T05** | Buyer search engine: multi-attribute filtering, sorting, pagination, benchmarks | **Anu** |
| **T06** | Product comparison matrix and saved favorites management | **Anu** |
| **T07** | In-app messaging system: real-time conversation threads, unread counters | **Jayant** |
| **T08** | Purchase request workflow: submission, negotiation, acceptance, sales history | **Jayant** |
| **T09** | Observer pattern implementation: event dispatcher, notification feeds, watcher | **Jayant** |
| **T10** | Reputation engine: buyer review submission, aggregate rating recalculation | **Anu** |
| **T11** | Role-tailored dashboards for Buyers and Sellers | **Jaspreet** |
| **T12** | Cloud production deployment on Render and MongoDB Atlas configuration | **Ilyan** |

---

## 9. Academic Integrity & Course Information

This software project was developed for **CS 476: Software Development and Demonstration** at the **University of Regina**. All design patterns, architectural structures, and application code were implemented from scratch to satisfy course specifications and software quality criteria.
