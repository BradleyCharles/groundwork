# Handover

For a new maintainer taking over this project.

## Run it

1. Install Node 24 or newer and Docker.
2. `npm ci`
3. `npx supabase start -x studio` (add services back as needed)
4. `cp .env.example .env.local`, then fill the values from `npx supabase status` (publishable key and secret key).
5. `npm run dev`

## Where things are

- `AGENTS.md`: the rules every contributor and coding agent follows.
- `docs/technical-map/`: how the app works, one file per area.
- `docs/decisions/`: why choices were made.
- `supabase/migrations/`: the only place schema changes are written. `supabase/schema.sql` and `policies.sql` are generated.
- `SESSION_STATE.md`: current working state.

## Checks before merging

`npm run lint && npm run typecheck && npm test && npm run build`, plus `npx supabase test db` for database changes. CI runs the same checks and also scans for secrets and verifies the generated database docs.

## Secrets

Never commit `.env*` files. Server-only keys (`SUPABASE_SECRET_KEY`) are set in the hosting provider's environment settings. Rotate any key that was ever pasted into chat or a commit.

## Roles

User roles live in `auth.users.raw_app_meta_data` and are set only through the admin client on the server.
