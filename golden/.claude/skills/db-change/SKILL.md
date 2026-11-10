---
name: db-change
description: Make a database change end to end: migration, local reset, regenerated docs, pgTAP tests, review. Use for any new table, column, policy, grant, or function.
---

# Database change

Follows the Database Change Procedure in `AGENTS.md`. Never edit `supabase/schema.sql` or `supabase/policies.sql`; they are generated.

1. Write a re-runnable migration in `supabase/migrations/` with the next number (`0002_<what>.sql`). Use `if not exists`, `create or replace`, and `drop ... if exists` before create. For a new table: add explicit policies for each operation, `with check` on UPDATE, column-level `GRANT UPDATE` for client-editable columns, and no grants to `anon`.
2. Apply it locally: `npx supabase db reset` (start Supabase first with `npx supabase start` if it is not running).
3. Regenerate the docs: `npm run db:docs`.
4. Add or update a pgTAP test in `supabase/tests/database/` for each policy or grant change: own-row allowed, cross-user denied, `anon` denied, protected columns immutable. Run `npx supabase test db`.
5. Run `npm run db:verify` if Docker is available, to prove the generated files apply to a fresh database.
6. Update `docs/technical-map/06-database.md` and any API or permissions docs the living-docs table lists.
7. Run the `db-reviewer` subagent on the new migration and fix its findings.
8. Ask the user to review and commit the migration, regenerated files, tests, and docs together. Do not commit.
