# proposals

Owns: developers submitting proposals to projects, clients sending direct
invitations, shortlisting, accept/decline.

Tables: `proposals`, `invitations`.

Accepting a proposal (or an invitation leading to agreement) is what creates
an `agreements` row — that handoff is the seam between this module and
`agreements`. Keep it as an explicit function call
(`acceptProposal(proposalId) -> creates draft agreement`), not implicit.

## Screen content (not layout — just what belongs on each screen)

**Submit proposal (developer):** introduction message, proposed amount/rate,
estimated timeline, attach relevant portfolio items, submit.

**Client's proposal inbox (per project):** list of proposals (developer
photo/name/rating-or-"New" badge, proposed amount, timeline, intro snippet),
actions (view full, shortlist, decline), sort (newest, price, rating).

**Proposal detail (client):** full intro, proposed terms, linked portfolio
items, developer summary (skills, rating/badge), accept/decline/message.

**Direct invitation (client, from a developer's profile):** select one of
your published projects, optional personal message, send.

**Developer's invitations inbox:** project title, budget, client, message,
accept (→ proposal/agreement) or decline.
