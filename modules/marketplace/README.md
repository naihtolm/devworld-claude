# marketplace

Owns: project posting, browsing, search, categories.

Tables: `projects`, `project_skills`, `project_attachments`.

Status lifecycle (from the blueprint) lives on `projects.status`:
draft → published → in_discussion → proposals_open → developer_selected →
agreement_pending → funded → active → delivered → under_review → completed
(with cancelled/disputed/on_hold/expired as side-branches).

V1 build order:
1. Project creation form (client-only) — title, description, category,
   required skills, budget type/range, timeline
2. Browse page with Postgres full-text search + filters (category, skill,
   budget range) — don't add Meilisearch/Algolia until this is actually slow
3. "Quick Projects" is just a category/budget-range filter, not a separate
   system — keep it simple in the data model

## Screen content (not layout — just what belongs on each screen)

**Post a project (client):** title, description, category, required skills
(multi-select), budget type (fixed/milestone/hourly), budget range, timeline,
visibility (public/invite-only), attachments, save-as-draft/publish.

**Browse projects (developer):** search bar, filters (category, skill, budget
range, timeline), project cards (title, budget, category, skill tags, posted
date, description snippet), sort (newest, budget).

**Project detail page:** full title/description/budget/timeline/skills,
client/company name (linked), attachments, "Submit Proposal" (developer) or
"Edit"/"View Proposals" (owner), status badge.

**Client's "My Projects" dashboard:** posted projects with status, proposal
count, quick actions.
