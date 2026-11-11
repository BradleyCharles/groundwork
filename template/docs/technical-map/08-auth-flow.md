# Auth Flow

Last updated: 2026-11-09

1. Browser signs in with `supabase.auth.signInWithPassword` (publishable key); session cookies are set.
2. `proxy.ts` runs on each request: calls `getClaims()` (validates the JWT, refreshes cookies), redirects or 401s when unauthenticated on a non-public path, and sets the nonce CSP.
3. Server code calls `requireUser()` / `requireRole()` (`lib/auth/guards.ts`), which use `getClaims()` again. Use `getUser()` before sensitive writes.
4. Database access runs as the signed-in user, so RLS applies. The admin client is for server-only writes.
