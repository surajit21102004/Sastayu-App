# Sastayu Backend API

Node.js + Express backend with live MySQL database integration for Sastayu On-Demand Home Services.

## Live Database Credentials
- **Host**: `s1-nnvp.crazzydns.com`
- **Port**: `3306`
- **Database**: `ecompone_sathayu`
- **User**: `ecompone_sasthayu`
- **phpMyAdmin**: [https://s1-nnvp.crazzydns.com:2083/cpsess1606703657/3rdparty/phpMyAdmin/index.php?route=/database/structure&db=ecompone_sathayu](https://s1-nnvp.crazzydns.com:2083/cpsess1606703657/3rdparty/phpMyAdmin/index.php?route=/database/structure&db=ecompone_sathayu)

---

## Automatic Database Migration & Tables Created

Whenever the server starts, `config/db.js` automatically executes `config/schema.sql` creating all tables if they don't already exist and seeds initial data:

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `users` | Customers & Admins | `id`, `phone`, `name`, `role`, `address`, `created_at` |
| `workers` | Service Partners / Professionals | `id`, `phone`, `name`, `trade`, `rating`, `total_jobs`, `is_online`, `status` |
| `services` | 100+ Catalog & 8 Core Services | `id`, `category`, `name`, `description`, `base_price`, `icon`, `is_active` |
| `bookings` | Customer Orders & Jaldi Requests | `id`, `booking_number`, `user_id`, `worker_id`, `service_title`, `status`, `otp`, `total_amount` |
| `disputes` | Extra Charge Reports (Disputes) | `id`, `booking_id`, `user_id`, `app_price`, `worker_asked_amount`, `extra_amount`, `reason`, `notes` |
| `reviews` | Job Completed Ratings & Reviews | `id`, `booking_id`, `user_id`, `worker_id`, `rating`, `tags`, `comment` |
| `worker_earnings` | Partner Wallet & Job Payouts | `id`, `worker_id`, `booking_id`, `amount`, `type`, `status` |

---

## API Endpoints

### 1. Health & Status
- `GET /api/health` — Pings live MySQL and reports status.

### 2. Authentication (`/api/auth`)
- `POST /api/auth/customer/send-otp` — `{ phone: "9876543210" }`
- `POST /api/auth/customer/verify-otp` — `{ phone: "9876543210", otp: "4321" }`
- `POST /api/auth/worker/login` — `{ phone: "9876543210", trade: "Electrician" }`
- `POST /api/auth/worker/register` — `{ phone, name, trade }`
- `GET /api/auth/me` — Protected route returning user/worker profile.

### 3. Bookings (`/api/bookings`)
- `POST /api/bookings` — Create a new on-demand or scheduled booking.
- `GET /api/bookings` — List bookings (optional `?status=upcoming|completed|cancelled`).
- `GET /api/bookings/:id` — Details of specific booking.
- `PATCH /api/bookings/:id/status` — Update booking status (`in_progress`, `cancelled`, etc.).
- `POST /api/bookings/:id/complete` — Verify OTP and complete booking.

### 4. Worker Partner Portal (`/api/workers`)
- `GET /api/workers/nearby?trade=Electrician` — Nearby verified active technicians.
- `GET /api/workers/dashboard` — Live stats (`todayEarnings`, `jobsDone`, `isOnline`, active bookings).
- `PATCH /api/workers/status` — Toggle Online / Offline status.
- `GET /api/workers/earnings` — Wallet balance and payout history.

### 5. Extra Charge Disputes (`/api/disputes`)
- `POST /api/disputes/report-extra` — Report extra charge with app price, asked price, and reason.
- `GET /api/disputes` — List reported disputes.

### 6. Services (`/api/services`)
- `GET /api/services` — List all services.
- `GET /api/services/categories` — List distinct categories.

---

## How to Run

```bash
cd be

# Run all API tests against live MySQL:
npm run test-db
node test-api.js

# Start the Express server:
npm start
# or development with auto-reload:
npm run dev
```
