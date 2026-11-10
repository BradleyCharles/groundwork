# Security Policy

## Reporting

Report suspected vulnerabilities privately to the maintainers (replace this line with a contact address or the repository's private security advisory link). Do not open a public issue. Include steps to reproduce and the affected route or table.

## Baseline

- Row Level Security is enabled on every `public` table; nothing is granted to `anon`.
- Identity checks use `getClaims()`; roles come from `app_metadata`.
- Responses never include raw database or library errors.
- A nonce-based Content-Security-Policy and standard security headers apply to all routes.
- CI scans for committed secrets and runs `npm audit` at high severity.

Full rules: `docs/security-constraints.md`.
