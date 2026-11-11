# API Routes

Last updated: 2026-11-09

## `GET /api/profile`

Returns `{ id, display_name }` for the signed-in user. 401 without a session.

## `PATCH /api/profile`

Body: `{ "display_name": string (1-80 chars) }`, unknown keys rejected (400). Updates only the caller's row. Returns `{ ok: true }`. Errors return `{ error }` with no internals.
