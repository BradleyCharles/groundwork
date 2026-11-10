begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Two users; the auth.users trigger creates their profiles.
insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

-- ensure_rls turns RLS on for tables created later
create table public.rls_probe (id int);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rls_probe'::regclass),
  'ensure_rls enables RLS on new public tables'
);

-- anon: no access
set local role anon;
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');

-- user A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'user A sees exactly one profile');
select is((select id::text from public.profiles), '00000000-0000-0000-0000-0000000000a1', 'user A sees their own profile');

update public.profiles set display_name = 'Alice';
select is((select display_name from public.profiles), 'Alice', 'user A can edit display_name');

select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-0000000000b2'$$,
  '42501', null, 'user A cannot change the id column'
);
select throws_ok(
  $$update public.profiles set created_at = now() - interval '1 year'$$,
  '42501', null, 'user A cannot change created_at'
);

-- cross-user update affects zero rows
with changed as (
  update public.profiles set display_name = 'x' where id = '00000000-0000-0000-0000-0000000000b2' returning 1
)
select is((select count(*)::int from changed), 0, 'user A cannot update user B');

select * from finish();
rollback;
