# reviews

Owns: two-way reviews left after an agreement completes.

Table: `reviews` — one row per (agreement, reviewer), enforced by a unique
index. Both client→developer and developer→client reviews use the same
table; `revieweeUserId` determines direction.

Per the blueprint's trust principle: show transparent signals (completed
projects, rating, repeat-client rate) rather than a single opaque score.
