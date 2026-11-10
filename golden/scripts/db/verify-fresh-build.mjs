#!/usr/bin/env node
// Applies the generated supabase/schema.sql and supabase/policies.sql to a throwaway Postgres
// container and fails if they do not apply cleanly.
//   CONTAINER_CLI  container tool (default: docker)
//   POSTGRES_IMAGE image to run (default: postgres:17-alpine)
//   PG_USER        superuser inside the image (default: postgres)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = process.env.CONTAINER_CLI ?? "docker";
const IMAGE = process.env.POSTGRES_IMAGE ?? "postgres:17-alpine";
const PG_USER = process.env.PG_USER ?? "postgres";
const NAME = `golden-verify-${process.pid}`;

// Minimal stand-ins for what Supabase provides, so the generated files can apply on plain Postgres.
const BOOTSTRAP = `
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`;

function run(args, input) {
  return spawnSync(CLI, args, { input, encoding: "utf8" });
}

function psql(sql, label) {
  const r = run(
    ["exec", "-i", NAME, "psql", "-v", "ON_ERROR_STOP=1", "-U", PG_USER, "-d", "postgres", "-q"],
    sql,
  );
  if (r.status !== 0) {
    console.error(`FAILED applying ${label}:\n${r.stderr}`);
    throw new Error(label);
  }
}

let failed = false;
try {
  const start = run([
    "run",
    "-d",
    "--rm",
    "--name",
    NAME,
    "-e",
    "POSTGRES_PASSWORD=throwaway",
    IMAGE,
  ]);
  if (start.status !== 0) throw new Error(`could not start ${IMAGE}: ${start.stderr}`);

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = run(["exec", NAME, "pg_isready", "-U", PG_USER, "-d", "postgres"]).status === 0;
    if (!ready) spawnSync("node", ["-e", "setTimeout(()=>{},1000)"]);
  }
  if (!ready) throw new Error("postgres did not become ready");
  // The image restarts once after init; wait for it to settle, then probe with a real query.
  for (let i = 0; i < 30; i++) {
    if (
      run(["exec", NAME, "psql", "-U", PG_USER, "-d", "postgres", "-qtc", "select 1"]).status === 0
    )
      break;
    spawnSync("node", ["-e", "setTimeout(()=>{},1000)"]);
  }

  psql(BOOTSTRAP, "bootstrap");
  psql(readFileSync(join(ROOT, "supabase", "schema.sql"), "utf8"), "supabase/schema.sql");
  psql(readFileSync(join(ROOT, "supabase", "policies.sql"), "utf8"), "supabase/policies.sql");
  console.log("OK: schema.sql and policies.sql apply cleanly to a fresh database.");
} catch (e) {
  failed = true;
  console.error(String(e.message ?? e));
} finally {
  run(["rm", "-f", NAME]);
}
process.exit(failed ? 1 : 0);
