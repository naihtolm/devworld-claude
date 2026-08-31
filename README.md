# Devworld

A specialized marketplace connecting businesses with developers and technical
professionals. See `/modules/*/README.md` for what each domain owns and the
suggested build order within it.

## Stack

Next.js (App Router, TypeScript) · PostgreSQL via Drizzle ORM · Clerk (auth)
· Stripe Connect (payments) · Tailwind CSS

Architecture: a **modular monolith** — one deployable app, but organized into
`/modules/<domain>` with clear boundaries, so it stays easy to reason about
(and easy to hand to an AI coding tool one module at a time) without the
operational overhead of microservices before you have the traffic to need them.

## Setup (things only you can do — account creation, credentials)

1. **Database** — create a free Postgres instance at
   [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
   Copy the connection string.
2. **Auth** — create a free app at [clerk.com](https://clerk.com). Copy the
   publishable key and secret key from the API Keys page.
3. **Storage** — Supabase Storage, for project attachments. If your database
   is already on Supabase, reuse that project: dashboard → Settings → API →
   Project URL + `service_role` key.
4. **Payments** — create a [stripe.com](https://stripe.com) account, enable
   **Connect** (Settings → Connect), and grab your test-mode secret key. For
   the webhook secret in local dev, run
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (adjust
   the port to whatever `npm run dev` prints) and copy the signing secret it
   prints — that's `STRIPE_WEBHOOK_SECRET`.
5. Copy `.env.example` to `.env.local` and fill in the four sets of keys
   above.

## Setup (once .env.local is filled in)

```bash
npm install
npm run db:push      # creates all tables from db/schema.ts in your database
npm run dev           # http://localhost:3000
```

## What's here

```
app/                  Routes (thin — calls into modules/)
  (marketplace)/projects/   Browse page, wired to a real query already
db/
  schema.ts            Full V1 schema — users, profiles, projects, proposals,
                        agreements, milestones, payments, messaging, reviews,
                        disputes, admin
  index.ts              Drizzle client
modules/               One folder per domain — see each README.md
middleware.ts          Clerk route protection (dashboard/messages/proposals
                        are protected; browsing is public)
```

## What's NOT here yet

Everything in `/modules/*/README.md` marked as "build order" — this scaffold
gives you working auth, a real database connection, and one real page
(project browsing) so you have a running app on day one. Proposals,
agreements, Stripe Connect onboarding, and messaging UI are the next slices —
build them in that rough order, since each depends on the one before it.
