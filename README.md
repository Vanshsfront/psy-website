# Psy Tattoos & Jewels

This is a production-ready Next.js 14 App Router platform designed for a dark aesthetic tattoo studio and premium jewelry e-commerce site. 

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Framer Motion
- **Database / Auth / Storage:** Supabase
- **Admin Authentication:** NextAuth.js v5 (beta)
- **State Management:** Zustand
- **Payments:** Razorpay
- **Forms & Validation:** React Hook Form + Zod + TipTap Rich Text

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your keys.

- **Supabase:** You need your URL, Anon Key, and Service Role Key.
- **Razorpay:** Key ID, Secret, and Webhook Secret for local/prod testing.
- **NextAuth:** Generate a secret using `npx auth secret` or `openssl rand -base64 32`.

### 3. Database Schema setup (Supabase)
The database schema includes tables for:
- `admin_users`
- `artists`
- `styles`
- `portfolio_items`
- `bookings`
- `products`
- `orders`

Execute the migrations (or run queries) to scaffold these tables. Ensure RLS policies are set to allow public reads on products/portfolio, but restrict inserts/updates to authenticated service roles or active NextAuth admin sessions.

***Note on default admin initialization***:
The `admin_users` table expects a bcrypt hashed password.
To create your first admin, manually hash a password (e.g., using a node script) and insert it:
`INSERT INTO admin_users (username, password_hash) VALUES ('admin', '$2a$10$YOUR_BCRYPT_HASH');`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Deployment
Optimized for Vercel deployment. Ensure you add all environment variables inside your Vercel Project Settings before deploying. Run `npm run build` locally to verify type-safety and builds beforehand.
