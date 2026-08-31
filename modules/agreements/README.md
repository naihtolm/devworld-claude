# agreements

Owns: structured project agreements, milestones, change requests.

Tables: `agreements`, `milestones`, `change_requests`.

This is one of Devworld's core differentiators — treat it carefully:
- Both parties must explicitly accept (`clientAcceptedAt` /
  `developerAcceptedAt` both set) before status moves to `active`
- A change request is never a silent edit to `agreements` — it's its own row
  that, once approved, is what updates scope/amount/timeline. This keeps an
  auditable history of what actually changed and when.
- Milestones belong to one agreement and have their own status lifecycle
  (pending → funded → in_progress → submitted → approved → paid), driven by
  the `payments` module via Stripe webhooks
