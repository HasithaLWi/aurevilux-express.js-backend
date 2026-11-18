# 🏛️ Aurevilux Backend — Haute Couture Luxury API & Services

[![Production API](https://img.shields.io/badge/Production%20API-Online-emerald?style=for-the-badge&logo=render)](https://aurevilux-backend.onrender.com/api/v1/health)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2+-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Storage-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

The enterprise-grade RESTful API backend driving **Aurevilux**, the premier luxury fashion marketplace and atelier management platform. Engineered with Express 5, TypeScript, MongoDB Atlas, Supabase Storage, and dual-provider Generative AI (Google Gemini & Groq).

---

## 🌐 Live Production Deployment

* **Base API Endpoint:** [`https://aurevilux-backend.onrender.com/api/v1`](https://aurevilux-backend.onrender.com/api/v1)
* **System Health Check:** [`https://aurevilux-backend.onrender.com/api/v1/health`](https://aurevilux-backend.onrender.com/api/v1/health)
* **Production Storefront & Back-Office:** [`https://aurevilux.vercel.app`](https://aurevilux.vercel.app)

---

## 💎 Core Architecture & Capabilities

```
                           AUREVILUX BACKEND (EXPRESS 5 + TYPESCRIPT)
                                            │
   ┌───────────────────┬────────────────────┼───────────────────┬───────────────────┐
   ▼                   ▼                    ▼                   ▼                   ▼
[ Auth & RBAC ]  [ Catalog Engine ]  [ Supabase CDN ]   [ AI Concierge ]    [ Order & Ops ]
 • JWT & Google   • Products CRUD     • aurevilux-       • Éléanore Model    • Lifecycle
 • Refresh Flow   • Populated Refs      products         • Dynamic Catalog   • Invoicing
 • Staff Invites  • Smart Intent      • aurevilux-         Context (Mongo)   • Courier Dispatch
 • 9 Luxury Roles • Size Allocation     videos           • Gemini / Groq     • Live Metrics
                                      • aurevilux-user     Multi-Provider    • Executive Reports
```

### 1. Dual-Provider AI Concierge (*Éléanore*)
* **Multi-LLM Dispatcher:** Switch seamlessly in Admin Settings between **Google Gemini** (`@google/generative-ai`) and **Groq** (`groq-sdk`), stored dynamically in MongoDB (`BusinessModel.conciergeConfig`).
* **Dynamic Atelier Catalog Context:** Injects live MongoDB products, categories, price points, and atelier provenance into prompt memory on every turn.
* **Strict Luxury Guardrails:** Enforces a 5-turn FIFO conversational window, Parisian haute couture tone, and automatic refusal of non-fashion inquiries.

### 2. Multi-Bucket Supabase Cloud Storage
* `aurevilux-products`: High-resolution imagery gallery photos and video poster frames.
* `aurevilux-videos`: Synchronized dual-layer editorial cinematic video intros (VP9 Alpha WebM + Apple Safari HEVC MP4).
* `aurevilux-user`: High-res customer and executive staff avatars.
* **Smart Asset Replacement:** Automatically purges replaced or deleted assets from Supabase to prevent orphaned storage bloat.

### 3. Granular Role-Based Access Control (RBAC)
Supports 9 distinct roles:
* `SUPERADMIN` (Full administrative sovereignty, financial audits, staff orchestration)
* `ADMIN` (Catalog management, operations, logistics, reports)
* `STAFF` (Catalog, inventory, and order dispatch management)
* `PRODUCT_MANAGER`, `ORDER_MANAGER`, `CUSTOMER_SUPPORT`, `CONTENT_MANAGER`, `MARKETING`
* `CUSTOMER` (Client portfolio, order history, wishlists, private reviews)

### 4. Advanced Product Search & Taxonomy
* Multi-dimensional search across title, brand maison, category taxonomy, and atelier departments (`MEN`, `WOMEN`, `ACCESSORIES`).
* Smart intent matching for `"new arrivals"`, `"latest"`, `"best seller"`, and `"coveted"`.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime & Language** | Node.js v20+, TypeScript 5+, tsx |
| **Web Framework** | Express v5.2 |
| **Database** | MongoDB Atlas via Mongoose v9.1 |
| **Object Storage CDN** | Supabase Storage (`@supabase/supabase-js`) |
| **Artificial Intelligence** | Google Gemini (`@google/generative-ai`), Groq SDK (`groq-sdk`) |
| **Authentication** | JWT (`jsonwebtoken`), Google OAuth 2.0 (`google-auth-library`), `bcryptjs` |
| **File Handling** | Multer (`multer`) memory storage |
| **Mailing & Alerts** | Nodemailer (Gmail SMTP SSL/TLS) |

---

## 📋 API Route Index (`/api/v1`)

### 🔐 Authentication & Session (`/auth`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new customer account | Public |
| `POST` | `/auth/login` | Email/password authentication (Returns Access & Refresh Tokens) | Public |
| `POST` | `/auth/google` | Google OAuth One-Tap sign-in | Public |
| `POST` | `/auth/refresh-token` | Generate new short-lived access token | Public |
| `GET` | `/auth/me` | Fetch authenticated patron / staff profile | Authenticated |
| `POST` | `/auth/forgot-password` | Issue password reset security token | Public |
| `POST` | `/auth/reset-password` | Set new password with reset token | Public |
| `GET` | `/auth/verify-invite/:token`| Validate atelier staff invitation token | Public |
| `POST` | `/auth/register-invite` | Activate invited staff credentials & role | Public |

### 👗 Product Catalog (`/products`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | List luxury pieces (Filter: search, brand, category, dept, sort, pagination) | Public |
| `GET` | `/products/:id` | Get piece by MongoDB ObjectId or URL slug | Public |
| `POST` | `/products` | Create luxury piece with size variants & video intro | Staff / Admin |
| `PUT` | `/products/:id` | Update luxury piece specifications & pricing | Staff / Admin |
| `PATCH` | `/products/:id/toggle-active` | Toggle Storefront Visibility vs. Atelier Archive | Staff / Admin |
| `PATCH` | `/products/:id/stock` | Rapid inventory stock count adjustment | Staff / Admin |
| `DELETE` | `/products/:id` | Soft-archive piece from catalog | Admin |
| `POST` | `/products/:id/reviews` | Submit verified client testimonial | Authenticated |

### 🤖 AI Concierge Service (`/concierge`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/concierge/chat` | Send patron inquiry with 5-turn history; returns Éléanore AI reply | Public |
| `GET` | `/concierge/status` | Read active AI provider and service status | Public |

### 📂 Cloud Storage Uploads (`/upload`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload/single` | Upload photo to Supabase (`aurevilux-products`) | Authenticated |
| `POST` | `/upload/video` | Upload WebM/MP4 video to Supabase (`aurevilux-videos`) | Authenticated |
| `POST` | `/upload/multiple` | Upload up to 10 photos in a single batch | Authenticated |
| `DELETE` | `/upload` | Purge asset from Supabase Storage by public URL | Authenticated |

### 🏷️ Maisons & Categories (`/brands`, `/categories`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/brands` | List all curated luxury Maisons | Public |
| `POST` | `/brands` | Register new Maison profile | Admin |
| `GET` | `/categories` | List hierarchical taxonomy categories | Public |
| `POST` | `/categories` | Create category & department mapping | Admin |

### 📦 Orders & Logistics (`/orders`, `/couriers`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/orders` | List atelier acquisitions & sales | Authenticated |
| `POST` | `/orders` | Place new luxury order & dispatch confirmation email | Authenticated |
| `PATCH` | `/orders/:id/status` | Advance order state (`Pending` → `Processing` → `Dispatched` → `Delivered`) | Staff / Admin |
| `GET` | `/orders/stats` | Executive KPI revenue & fulfillment statistics | Admin |

### 📊 Executive Administration & Business Settings (`/admin`, `/business`)
| Method | Route | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/metrics` | Real-time Atelier sales, VIP retention & SKU health | Admin |
| `GET` | `/business` | Read atelier metadata and AI concierge config | Public |
| `PUT` | `/business` | Update business metadata & toggle active AI provider (`gemini`/`groq`) | Admin |

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the `backend/` directory based on the following template:

```env
# ─── Server & Security ────────────────────────────────────────────────────────
PORT=5000
FRONTEND_URL=https://aurevilux.vercel.app
JWT_SECRET=your_jwt_secret_hex_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_hex_key

# ─── Database ─────────────────────────────────────────────────────────────────
MONGO_ATLAS_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aurevilux?ssl=true&authSource=admin

# ─── Supabase Cloud Storage ───────────────────────────────────────────────────
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_key
SUPABASE_SECRET_KEY=sb_secret_key
SUPABASE_BUCKET=aurevilux-products
SUPABASE_USER_BUCKET=aurevilux-user
SUPABASE_VIDEO_BUCKET=aurevilux-videos

# ─── AI Concierge Providers ───────────────────────────────────────────────────
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b

# ─── Nodemailer SMTP (Receipts & Staff Invites) ────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aurevilux@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Aurevilux Concierge" <aurevilux@gmail.com>

# ─── Google OAuth ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 🚀 Local Development Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database (Optional)
Populate the database with initial Maisons (Burberry, Chanel, Cartier, Gucci, Hermès, Calvin Klein), categories, and luxury piece collections:
```bash
npm run db:seed
```

### 3. Start Development Server
Starts the Express server with live TypeScript reloading:
```bash
npm run dev
```
The server will boot on `http://localhost:5000` with the health check live at `http://localhost:5000/api/v1/health`.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 👤 Author & Architecture
* **Lead Engineer & Architect:** Hasitha Wijesinghe
* **Project:** RAD Coursework — Aurevilux Luxury Marketplace System
