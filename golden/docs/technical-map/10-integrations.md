# Integrations

Last updated: 2026-11-09

| Service  | Used for          | Keys                                                                                                             |
| -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Supabase | Auth and Postgres | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public); `SUPABASE_SECRET_KEY` (server only) |

Add third-party origins to the CSP in `proxy.ts`. Every external call needs a timeout and error mapping.
