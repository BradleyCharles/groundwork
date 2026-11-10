---
name: security-audit
description: Run a read-only security audit of one domain (for example auth, database, API routes, headers, secrets) and record the result. Use when the user asks for an audit.
---

# Security audit

Follows the Security Audits section of `AGENTS.md`. One domain per session.

Rules for the run:

- Read-only. Change no application code, migrations, or configuration during an audit. Findings are recorded; fixes are separate work.
- A control is "Pass" only with positive evidence: cite `file:line` showing it is enforced. Absence of a problem you did not look for is not a Pass; mark it "Not checked".
- Never record secret values. Refer to a secret by its variable name and location only.
- Severity can be raised on later runs, never lowered, unless the fix is verified and cited.
- Do not run commands that modify state, call external services with real credentials, or read `.env*` files.

Steps:

1. Ask which single domain to audit if the user did not say. Read `AGENTS.md` (Security Constraints) and `docs/security-constraints.md`.
2. List the controls for that domain from those documents.
3. For each control, find the code that enforces it and record Pass (with evidence), Fail (with evidence and a suggested fix), or Not checked (with the reason).
4. Write the result to `docs/audits/<domain>-<YYYY-MM-DD>.md` with Scope, Controls (table: control, result, evidence), Findings (severity High/Medium/Low), and Not checked. Create `docs/audits/` if it does not exist.
5. Summarize for the user: counts by result, and the highest-severity findings. Do not commit.
