---
name: feature-spec
description: Create a feature spec from docs/specs/_template.md, including the Already complete and Files to leave alone sections. Use before starting any feature larger than a small fix.
---

# Feature spec

1. Copy `docs/specs/_template.md` to `docs/specs/<short-kebab-name>.md`.
2. Fill in every section:
   - What and Why: concrete behavior and the problem, in plain words.
   - Scope: what is in and, just as important, what is out.
   - Already complete: do not touch: read the current code and technical map, then list the existing behavior, files, or tables this work must not alter. Do not leave it blank; write "Nothing" only after checking.
   - Files to leave alone: paths the implementation must not edit.
   - Test criteria: observable results, plus the Security Constraints, Accessibility Section 17, and living-docs checks that apply.
3. Ask the user to confirm the spec before implementing. Do not start work on an unconfirmed spec.
4. While implementing, stay inside the scope and respect both "do not touch" sections. If the work needs to cross them, stop and ask.
5. Add the item to `docs/roadmap.md` (What / Why / Scope / Test criteria) and move it to Completed when its test criteria pass.
