# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (type-checks included)
npm run lint     # ESLint
```

## Architecture

**PSY Tattoos & Jewels** — Next.js 14 App Router fullstack application with a public site (tattoo studio portfolio + jewelry e-commerce) and two separate admin panels.

### Dual Authentication Systems

1. **`/admin/*`** — NextAuth.js v5 (Credentials provider, JWT sessions, 24h expiry). Protected by `middleware.ts`. Uses `admin_users` table with bcrypt.
2. **`/storeadmin/*`** — Custom JWT auth via Jose. Token stored in localStorage as `psyshot_token`. Bypasses NextAuth middleware entirely. Superadmin role = `yogesh`.

These are completely independent systems. Do not mix their auth patterns.

### Data Layer

- **Database**: Supabase PostgreSQL with RLS policies (public reads, admin-only writes)
- **Server Components**: Use `createSSRClient()` from `lib/supabase-server.ts`
- **Client Components**: Use `createClient()` from `lib/supabase.ts`
- **Service Role**: `SUPABASE_SERVICE_ROLE_KEY` — only in API routes, never in frontend
- **Client fetching**: SWR hooks in `/hooks/` for admin data; Zustand stores in `/store/` for cart/wishlist

### Key Patterns

- Server Components by default; `"use client"` only where interactivity is needed
- Forms: React Hook Form + Zod validation
- Products use soft deletes (`is_deleted` flag) — never hard delete
- Product variants stored as JSONB
- Rich text via TipTap editor
- 3D jewelry visualization via Three.js / React Three Fiber (transpiled in `next.config.mjs`)

### Payment Flow (Razorpay)

Checkout → `POST /api/razorpay/create-order` (server-side price verification + stock check) → Razorpay embedded form → Webhook at `POST /api/razorpay/webhook` (signature verification) → order status updated. Falls back to `paymentMode: "manual"` if Razorpay is not configured.

### Store Admin (CRM) Special Features

- **OCR**: `POST /api/storeadmin/ocr/extract` uses Google Generative AI to parse order images
- **WhatsApp campaigns**: Natural language customer filtering resolved to SQL via LLM
- **Finance**: Revenue/expense aggregation, petty cash ledger, category breakdowns

### Styling

Tailwind with custom dark theme. Key colors: `ink` (bg #0A0A0A), `bone` (text #F5F3EF), `psy-green`, `gold`, `terracotta`. Fonts: Cormorant Garamond (display), DM Sans (body). Responsive via `clamp()` display sizes.

### API Route Structure

- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/admin/*` — NextAuth-protected CRUD
- `/api/storeadmin/*` — JWT-protected CRM endpoints
- `/api/razorpay/*` — Payment creation + webhooks
- `/api/guest-spot-leads` — Public form submissions

### Database Migrations

Located in `/supabase/migrations/`. Key files: `20240101000000_init.sql` (core schema), `rls.sql` (security policies), `storage_policies.sql` (image upload rules).
