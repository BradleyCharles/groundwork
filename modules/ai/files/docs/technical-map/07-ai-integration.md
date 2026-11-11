# AI Integration

Last updated: 2026-11-09

- `lib/ai/models.ts` holds the one model ID constant. Changing it needs explicit user approval.
- `lib/ai/client.ts` exposes `callModel()`. It validates the request against a strict schema (named fields only), sends it to the Anthropic Messages API with a 30 second timeout, and maps failures to `AiError` (400 invalid input, 502 upstream or configuration problem, 504 timeout). Upstream response bodies are never returned to clients.
- The key is read from `ANTHROPIC_API_KEY` on the server only.
- In a route: catch `AiError` and return `logAndRespond("route.name", error, error.status)`.
