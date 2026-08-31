# auth

Owns: account creation, login, session handling, role flexibility.

Backed by Clerk (`@clerk/nextjs`). Key decision from the blueprint: **one user
account, multiple optional roles** — a user isn't permanently a "client" or
"developer." A `users` row can have a `developer_profiles` row, a
`client_profiles` row, and/or `company_memberships` rows simultaneously.

Build order:
1. Clerk sign-up/sign-in pages (`/sign-in`, `/sign-up`)
2. Webhook (`/api/webhooks/clerk`) that creates a row in `users` when Clerk
   creates a user — keep `users.id` separate from Clerk's ID, store Clerk's
   ID in `users.authProviderId`
3. Onboarding flow: "Are you looking to hire, or looking for work?" → creates
   the relevant profile row (doesn't lock out the other path later)
