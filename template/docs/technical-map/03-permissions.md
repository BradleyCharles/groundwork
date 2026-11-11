# Permissions

Last updated: 2026-11-09

- Unauthenticated: `/` and `/login` only. Pages redirect to `/login`; `/api/*` returns JSON 401.
- Authenticated: all other routes. A user reads and edits only their own `profiles` row (RLS).
{{ROLES_LINE}}
