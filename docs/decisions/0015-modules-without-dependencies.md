# ADR 0015: Optional modules add files, not dependencies

- **Status:** Accepted

## Decision

The five modules (AI, encryption, email, Supabase MCP, rolecheck) add only files, slot lines and JSON merges. None adds an npm package. The AI and email modules call their APIs with `fetch`, a timeout and mapped errors.

## Reason

- The template ships `package-lock.json`. A module that added a dependency would invalidate it, so `npm ci` could not be used and the generated project would no longer match a tested lockfile.
- Every module combination therefore installs identically, and all 32 combinations are tested for clean builds.
- The roadmap rule "no new dependencies without approval" applies to the generator too.

## Consequences

- A module needing a real SDK later must regenerate the lockfile as part of that module's change, and the combination tests must cover it.
- Modules read their own environment variables inside their own files, so `lib/env.ts` is unchanged. The client-boundary test flags any non-`NEXT_PUBLIC_` environment access in `"use client"` files, which covers every module.
- The rolecheck module is a stub: it records the project's roles in `rolecheck.yaml`. The spec format is not final.
- The Supabase MCP URL (`https://mcp.supabase.com/mcp?project_ref=…&read_only=true`) should be re-checked against Supabase's documentation before v0.1.0.
