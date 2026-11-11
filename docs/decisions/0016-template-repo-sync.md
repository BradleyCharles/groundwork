# ADR 0016: Template repository sync

- **Status:** Accepted
- **Source:** scaffolder-roadmap.md, Section 7.6 and Phase 6

## Decision

- **Auth through git's environment, not a URL.** The token is supplied as an `http.extraheader` via `GIT_CONFIG_COUNT`/`KEY`/`VALUE`, so it is absent from the remote URL, `.git/config`, and argument lists. Output is scrubbed of the token and its base64 form.
- **Only template-mode output can be pushed.** The script requires `.groundwork-init.json`. This prevents a filled-in project reaching the template repository.
- **Whole-tree replacement.** Everything except `.git` is removed, then the new output is copied in, so deleted template files disappear.
- **Sync commits use a bot identity and `[skip ci]`.** The version is in the message. The template's own workflows cannot pass while placeholders remain.
- **The template repository has its own README, which `init` deletes.** It holds `<!-- groundwork-template-readme -->`; `init` removes a README carrying that marker and keeps any other README. Without this, `init(template)` would differ from `new` by one file.
- **Template mode is generated with `--no-git`** in the workflow, so no repository is created inside the output directory.

## Verification

`scripts/sync-template-repo.test.ts` runs the real script against a local bare repository: first push, no-op resync, change, deletion, dry run, refusal of non-template output, bad version, and token handling. It also checks the phase exit criterion: syncing, copying the result as a user would, running `init`, and comparing with `new`, with and without modules.

## Not verified here

Pushing to GitHub itself, since that needs the repository and token from `docs/template-repo.md`.
