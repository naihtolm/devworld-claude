# messaging

Owns: conversations tied to a project or agreement, messages.

Tables: `conversations`, `conversation_participants`, `messages`.

V1: simple polling or Supabase Realtime subscription on the conversation's
messages — no need for a dedicated WebSocket service at this scale. Every
conversation should reference a `project_id` or `agreement_id` so context is
preserved if a dispute happens later.
