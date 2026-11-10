# ADR 0011: Nonce-based CSP in proxy.ts

- **Status:** Accepted
- **Source:** scaffolder-roadmap.md, design goal G15

## Decision

`proxy.ts` generates a nonce per request and sets `Content-Security-Policy` with `script-src 'self' 'nonce-…' 'strict-dynamic'` and a nonce `style-src`. `'unsafe-inline'` is allowed for styles and `'unsafe-eval'` for scripts in development only.

## Rendering implication (verified)

Next applies the nonce to its own scripts only for dynamically rendered pages. The root layout calls `await headers()`, which makes every route dynamic (`ƒ` in the build output). Static generation and CDN caching of pages are given up in exchange for a strict CSP.

## Verification (Next 16.4.6, production build)

`next start`, then `curl`: the response carries the CSP header, and `<script>` tags in `/login` carry a `nonce` attribute. `/api/profile` without a session returns 401 JSON; an unknown page redirects with 307 to `/login`.

Still to confirm in a browser: no CSP violations in the console on starter routes (covered later by the Playwright + axe run).
