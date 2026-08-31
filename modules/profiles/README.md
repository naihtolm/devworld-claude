# profiles

Owns: developer profiles, client profiles, company profiles, portfolio, skills.

Tables: `developer_profiles`, `developer_skills`, `portfolio_items`,
`client_profiles`, `companies`, `company_memberships`, `skills`.

Key differentiator to build carefully: **GitHub/GitLab/LinkedIn connection**
as proof-of-skill. Suggested flow:
1. OAuth connect via Clerk's social connections or a dedicated GitHub OAuth app
2. Pull public repos via the GitHub API (name, description, language, stars,
   last-updated) and let the developer choose which to feature as portfolio
   items — don't auto-import everything, some repos are junk/forks
3. Store the chosen repos as `portfolio_items` rows with `repo_url` set

Skills should be selected from the `skills` table (autocomplete), not free
text — this is what makes future search/matching (V2) possible.

## New-account display rule

A brand-new profile has zero reviews and zero completed projects. Don't
render that as a 0.0 star rating or "0 reviews" — that reads as untrustworthy
rather than neutral, and it's a bad first impression for a marketplace's very
first users. Instead, show a **"New to Devworld"** badge in place of a rating
until the profile has at least one completed agreement. Applies to both
developer and client/company profiles. This is a display-layer decision only
— no schema change needed, it's derived from whether `reviews`/completed
`agreements` exist for that user.
