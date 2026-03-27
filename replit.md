# ZamCredit — Multi-Tenant Enterprise Credit Scoring Platform (Zambia)

## Overview

A production-ready, multi-tenant enterprise credit scoring platform for Zambia. Financial institutions (banks, MFIs, fintechs) can query customer credit profiles using NRC or Passport numbers. The platform aggregates data from banks, MFIs, and mobile network operators (MNOs) to generate real-time credit scores and risk ratings using rule-based logic and AI models.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (Node.js)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Auth**: JWT (jsonwebtoken + bcryptjs)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server (all backend logic)
│   └── credit-platform/    # React + Vite frontend (3 dashboards)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (seed.ts)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **tenants** — Banks, MFIs, fintechs with isolated config and API keys
- **users** — Platform users with roles (super_admin, tenant_admin, tenant_user, customer)
- **customers** — Zambian customers identified by NRC or Passport
- **credit_scores** — Historical credit score records per customer
- **loans** — Loan records from all institutions (bank, mfi, mno)
- **consents** — Customer data sharing consent records per tenant/data type
- **audit_logs** — Full audit trail of all API actions

## API Routes

All routes are under `/api`:

- `GET /healthz` — Health check
- `POST /auth/login` — JWT login
- `GET /auth/me` — Current user profile
- `POST /identity/verify` — Verify customer by NRC/Passport/Phone
- `GET /credit-score/:nrc` — Full credit score with breakdown
- `GET /loan-exposure/:nrc` — Total loan exposure across all institutions
- `GET /risk-profile/:nrc` — Complete risk profile with AI insights
- `POST /consent/grant` — Grant data sharing consent
- `POST /consent/revoke` — Revoke consent
- `GET /consent/status` — Get active consents
- `GET /tenants` — List tenants (super admin)
- `POST /tenants` — Create tenant (super admin)
- `PUT /tenants/:id` — Update tenant (super admin)
- `DELETE /tenants/:id` — Delete tenant (super admin)
- `POST /tenants/:id/api-key` — Regenerate API key
- `GET /analytics/system` — System-wide analytics (super admin)
- `GET /analytics/tenant` — Tenant-specific analytics
- `POST /integrations/bank/fetch` — Fetch mock bank data
- `POST /integrations/mno/fetch` — Fetch mock MNO mobile money data
- `POST /integrations/mfi/fetch` — Fetch mock MFI loan data
- `GET /audit-logs` — Paginated audit log viewer

## Frontend Dashboards

1. **Super Admin Dashboard** (`/admin`) — Manage all tenants, system analytics, audit logs
2. **Tenant Dashboard** (`/dashboard`) — NRC lookup, credit score view, loan exposure, risk profile
3. **Consent Portal** (`/consent`) — Customer manages data sharing consent per data type

## AI Credit Scoring Model

Logistic regression approximation with 5 components:
- **Repayment History** (0–300): Based on missed payments and loan completion rate
- **Loan Defaults** (0–200): Penalizes defaulted/written-off loans
- **Transaction Patterns** (0–250): Average monthly transactions + volume
- **Mobile Money** (0–150): Mobile money balance as proxy for financial inclusion
- **Account Age** (0–100): Length of credit history

Output: Score (0–1000), Rating, Probability of Default, Risk Level, AI Insights, Recommended Credit Limit

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@zamcredit.zm | admin123 |
| Tenant (Zanaco Bank) | zanaco@zamcredit.zm | zanaco123 |
| Tenant (FINCA) | finca@zamcredit.zm | finca123 |
| Customer | customer@zamcredit.zm | customer123 |

## Demo NRC Numbers

| Customer | NRC | Expected Score |
|----------|-----|----------------|
| Chanda Mwila | 12/345678/67 | Excellent (~905) |
| Mutale Bwalya | 87/654321/32 | Fair |
| Thandiwe Phiri | 34/789012/45 | Very Poor (defaults) |
| Joseph Lungu | 56/111222/78 | Excellent |
| Grace Tembo | 90/333444/12 | Fair |

## Mock External Integrations

Deterministic seeded random data generators simulate:
- **Bank connector**: Account balances, transaction history from Zanaco, Stanbic, FNB, etc.
- **MNO connector**: Mobile money balance, transaction volumes from MTN, Airtel Money, Zamtel
- **MFI connector**: Loan records from FINCA, Bayport, VisionFund, BRAC Zambia

## Security

- JWT authentication with 24h expiry
- Role-based access control (RBAC): super_admin > tenant_admin > tenant_user > customer
- Multi-tenant data isolation (each tenant only sees their data)
- Full audit logging of all API actions
- Passwords hashed with bcryptjs

## Scripts

- `pnpm --filter @workspace/db run push` — Push DB schema
- `pnpm --filter @workspace/scripts run seed` — Seed demo data
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API types
