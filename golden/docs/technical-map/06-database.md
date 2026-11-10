# Database

Last updated: 2026-11-09

Generated detail: `supabase/schema.sql`, `supabase/policies.sql` (never edited by hand).

## `public.profiles`

| Column         | Type        | Notes                                                   |
| -------------- | ----------- | ------------------------------------------------------- |
| `id`           | uuid        | Primary key, references `auth.users`, cascade delete    |
| `display_name` | text        | At most 80 characters; the only client-updatable column |
| `created_at`   | timestamptz | Set by default                                          |

- Policies: select and update own row (`id = auth.uid()`), update has `with check`.
- Grants: `authenticated` select and `update (display_name)`; `service_role` all; `anon` none.
- A trigger on `auth.users` (`handle_new_user`) creates the profile row.
- `ensure_rls` event trigger enables RLS on every new `public` table.
