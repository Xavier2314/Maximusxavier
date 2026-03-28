# FreelanceFund — Managed Freelance Earnings & Fund Control Platform

A transparent, dual-approval fund management platform for freelancers and their network.

## Architecture

```
/backend    Node.js + Express + TypeScript + Prisma + PostgreSQL
/frontend   React + TypeScript + Tailwind CSS + Vite
```

## Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Backend     | Node.js, Express, TypeScript          |
| Database    | PostgreSQL + Prisma ORM               |
| Auth        | JWT (bcrypt password hashing)         |
| Fintech     | Paystack (virtual accounts, transfers)|
| Email       | Resend                                |
| Frontend    | React 18, Vite, Tailwind CSS          |
| State       | TanStack Query (React Query)          |

## Roles

| Role     | View Balance | Initiate Withdrawal | Approve Withdrawal | Admin |
|----------|-------------|--------------------|--------------------|-------|
| Downline | Yes         | No                 | Yes (own wallet)   | No    |
| Sponsor  | Yes         | Yes                | Yes                | No    |
| Upline   | Yes         | No                 | No                 | No    |
| Admin    | Yes         | Yes                | Yes                | Yes   |

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Paystack account (test keys OK for dev)
- Resend account

### Backend

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npx prisma migrate dev --name init

# Seed test data
npx ts-node prisma/seed.ts

# Start dev server
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:3000 and proxies API calls to http://localhost:5000.

## Test Accounts (after seeding)

| Role     | Email                      | Password      |
|----------|----------------------------|---------------|
| Admin    | admin@freelancefund.app    | Admin@123456  |
| Sponsor  | sponsor@example.com        | Sponsor@123   |
| Downline | freelancer@example.com     | Downline@123  |

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET  /api/auth/me` — Get current user
- `PUT  /api/auth/change-password` — Change password

### Wallet
- `GET  /api/wallet/my` — Get my wallet
- `GET  /api/wallet/user/:userId` — Get user wallet (admin/sponsor)
- `GET  /api/wallet/transactions/my` — My transaction history
- `POST /api/wallet/credit` — Credit wallet (admin/sponsor)
- `POST /api/wallet/savings/lock` — Lock savings
- `POST /api/wallet/savings/unlock` — Unlock savings

### Withdrawals
- `GET  /api/withdrawals` — List withdrawals
- `GET  /api/withdrawals/:id` — Get withdrawal
- `POST /api/withdrawals` — Create withdrawal request (sponsor)
- `PUT  /api/withdrawals/:id/approve` — Approve (downline)
- `PUT  /api/withdrawals/:id/reject` — Reject (downline)
- `PUT  /api/withdrawals/:id/process` — Process transfer (admin)

### Admin
- `GET  /api/admin/stats` — Platform stats
- `GET  /api/admin/users` — All users
- `POST /api/admin/users` — Create user
- `PUT  /api/admin/users/:id` — Update user
- `POST /api/admin/subscriptions/renew` — Renew subscription
- `GET  /api/admin/audit-logs` — Audit logs
- `GET  /api/admin/banks` — List Nigerian banks

## Withdrawal Flow

```
Sponsor initiates → Downline receives email + notification →
Downline approves/rejects → Admin processes transfer → Funds sent via Paystack
```

## Subscription Model

- $1–$2/user/month (annual billing)
- Enforced on all wallet and withdrawal routes
- Admins bypass subscription checks
- Managed via `/api/admin/subscriptions/renew`

## Security

- JWT authentication with 7-day expiry
- Rate limiting (100 req/15min general, 10 req/15min auth)
- Helmet.js security headers
- Role-based access control
- Immutable audit logs
- No direct withdrawal without dual approval
