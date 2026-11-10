# Security Constraints: Rationale

`AGENTS.md` holds the rules. This file explains why each exists and how it is met in code. Last updated: 2026-11-09.

## Request bodies are never spread downstream

Spreading `await request.json()` into a database or API call lets a client set columns it should not (role, owner id, price). Validate with a zod schema (`.strict()` rejects unknown keys) and copy named fields with `pickAllowed` (`lib/validation/pick.ts`). Example: `app/api/profile/route.ts`.

## Every API route starts with a guard

`requireUser()` and `requireRole()` (`lib/auth/guards.ts`) return a 401/403 response or the user. `proxy.ts` also rejects unauthenticated `/api/*` calls, but the route guard stays, because the proxy matcher can change. Identity comes from `getClaims()`, which validates the JWT signature. Roles are read from `app_metadata` only; `user_metadata` is editable by the user and must never carry a role. Before a sensitive write (changing email, deleting data), additionally call `getUser()` so a revoked session is caught server-side.

## RLS is the authority

Application checks can be bypassed by a new route, a mistake, or direct API access with the publishable key. Policies cannot. `ensure_rls` enables RLS on every new `public` table. Test every policy in `supabase/tests/`.

## UPDATE policies and column grants

An UPDATE policy with only `using` lets a user change `id`/owner columns and hand rows to others. Add `with check` pinning ownership. For columns that must never change from the client (owner id, role, timestamps), grant `UPDATE` per column (`grant update (display_name) on public.profiles to authenticated`) instead of the whole table.

## Grants and functions

`anon` gets nothing in `public`. Functions are executable by `service_role` only until a migration grants them. A `security definer` function runs with its owner's rights, so it must set `search_path = ''` and must never accept a user id from the caller; derive it from `auth.uid()`.

## Admin client

`lib/supabase/admin.ts` uses the secret key and bypasses RLS. It imports `server-only` so a client import fails the build. If the server writes a table with it, give clients no write policy on that table, otherwise both paths exist and the weaker one wins.

## Errors

Raw errors reveal table names, constraints, and library internals. `logAndRespond()` logs on the server and returns a generic message.

## External calls

Third-party calls hang and fail. Use a timeout, `try/catch`, and map failures to a status the client can act on (502/504), without forwarding the upstream body.

## Output encoding

React escapes text by default. When building HTML strings (email templates), use `escapeHtml()`. `react/no-danger` is an error in ESLint.

## Secrets

Never log tokens or keys. Do not store third-party credentials in plaintext in tables readable by non-admins. `.env*` is gitignored, including stray copies; CI scans for committed secrets, and the CI build uses only public local-development values.

## Environment boundary

`lib/env.ts` validates env with zod. `clientEnv()` is safe in browser code; `serverEnv()` is not. `tests/env-boundary.test.ts` fails if a `"use client"` file references server-only values.

## Rate limiting

`lib/rateLimit.ts` defines a `RateLimitStore` interface. The in-memory default is per instance, so on serverless hosts it limits little; plug in a shared store. Client IP is taken only from the header named in `TRUSTED_IP_HEADER`, because other headers can be spoofed.

## Content Security Policy

`proxy.ts` sets a per-request nonce CSP. Pages render dynamically so the nonce can be applied (see ADR 0011 in the groundwork repository's `docs/decisions/`). Add third-party origins to `buildCsp()` explicitly.
