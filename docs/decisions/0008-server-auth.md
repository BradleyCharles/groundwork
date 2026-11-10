# ADR 0008: Server auth

- **ID:** D8
- **Status:** Accepted
- **Source:** scaffolder-roadmap.md, Section 1

## Decision

`getClaims()` for identity checks, `getUser()` before sensitive writes

## Reason

Current Supabase guidance; Epiteleia used `getUser()` everywhere. [verify]
