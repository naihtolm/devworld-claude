# admin

Owns: disputes, reports, moderation, the internal admin dashboard.

Tables: `disputes`, `reports`, `admin_actions`.

V1 is admin-assisted, not automated: a dispute is opened by a user, an admin
reviews evidence (the linked agreement, milestone, and message history) and
records a resolution. `admin_actions` is an audit log — every moderation
action (suspend user, resolve dispute, remove listing) should insert a row
here so there's a record of what an admin did and why.

This module is a good candidate to build *last* in V1 — you don't need it
until you have real disputes to handle.
