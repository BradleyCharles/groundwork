# State

Last updated: 2026-11-09

- Server state lives in Postgres. Session state lives in Supabase auth cookies.
- Client state is local to components; there is no global store.
- Rate-limit counters (`lib/rateLimit.ts`) are in memory and per instance.
