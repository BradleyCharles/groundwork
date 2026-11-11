# ADR 0014: Generator design

- **Status:** Accepted
- **Source:** scaffolder-roadmap.md, Sections 5 and 6 (Phase 4)

## Decision

- **`template/` is derived from `golden/`, never edited by hand.** `scripts/extract-template.mjs` applies `scripts/template.manifest.json`: exact string replacements that must match a declared number of times, plus anchored inserts for slots. A CI job runs `--check` so a change to one without the other fails.
- **Placeholders are `{{UPPER_SNAKE}}` tokens and whole-line slots** (`{{slot:name}}`, and `{{slot-block:name}}` which also drops the blank line after it when empty). An unknown token or slot is an error, so nothing is left half-filled. Values are inserted literally, never as patterns.
- **Answer values are validated against a strict character set** because they land in TypeScript string literals, JSX text, JSON, TOML and Markdown. Quotes, backslashes, backticks, braces, angle brackets and `$` are rejected.
- **`buildPlan` is pure.** Answers go in, a sorted list of files comes out, with no disk access, so the same answers always give byte-identical output and the plan can be tested without a filesystem.
- **One code path for `new` and `init`.** `--template-mode` leaves tokens and slots unfilled and adds `.groundwork-init.json`; `init` renders the existing files in place, adds module files, and deletes the marker. A test proves `init(template output)` equals `new` for the same answers.
- **The tool never commits except the initial commit, and asks first** unless `--yes` or `--config` is given.
- **`npm` is the only package manager in v0.1.** The permission rules, CI workflows and lockfile are npm-specific (see ADR 0015).
- **The assets ship inside the package** (`dist/assets/`), copied at build time, so `npm create groundwork` needs no network beyond the install. The template's `.gitignore` is stored as `_gitignore` because npm renames a published `.gitignore`.

## Exit criterion, verified

With golden's own answers and no modules, `buildPlan` output equals `golden/` file for file and byte for byte (99 files). A test enforces it, and it was also checked through the built binary.
