# Template repository setup

The `groundwork-template` repository is generated, never edited by hand. On each groundwork release the `Sync template repo` workflow generates a template-mode project (placeholders unfilled, init marker added) and pushes it there. A user clicks **Use this template**, clones, and runs `npx create-groundwork@latest init`.

## One-time setup (needs a GitHub account with admin rights)

1. **Create the repository.** Name it `groundwork-template`, in the same account or organization as this repository (the workflow builds the name from `github.repository_owner`). Make it public and leave it empty: no README, license, or `.gitignore`.
2. **Mark it as a template.** In the new repository: **Settings > General**, tick **Template repository** **[verify menu path]**.
3. **Create a token.** GitHub **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token** **[verify menu path]**.
   - Repository access: **Only select repositories**, then `groundwork-template` only.
   - Permissions: **Contents: Read and write**. Nothing else.
   - Set an expiry and a calendar reminder to rotate it.
4. **Store it.** In this repository: **Settings > Secrets and variables > Actions > New repository secret**. Name it `TEMPLATE_REPO_TOKEN` and paste the token.
5. **Run the first sync.** **Actions > Sync template repo > Run workflow**, leave the version as `manual`. Then open `groundwork-template` and confirm it contains the project files, a README, and `.groundwork-init.json`.
6. **Check the exit criterion by hand.** Click **Use this template**, create a repository, clone it, run `npx create-groundwork@latest init --yes --no-install`, and compare with `npm create groundwork@latest <dir> --yes --no-install` for the same answers (the file contents should be identical apart from the `.git` folder). The automated version of this check is in `scripts/sync-template-repo.test.ts`.

## How the token is handled

`scripts/sync-template-repo.mjs` passes the token to git through environment variables, so it never appears in a clone URL, a command line, or `.git/config`, and everything it prints is scrubbed of it. The script refuses to push anything that is not template-mode output (no `.groundwork-init.json`), so a filled-in project cannot reach the template repository.

## Things to know

- Sync commits carry `[skip ci]`. The template's workflows would fail there, because package names are still placeholders.
- The sync replaces the whole repository contents, so a file removed from `template/` is removed from the template repository too.
- Pushes use a plain `git push`. If someone edits the template repository directly, the next sync fails instead of overwriting their work; resolve it by hand.
- Whether a fine-grained token works with the `x-access-token` username over HTTPS has not been confirmed against GitHub: check it in step 5 **[verify]**.
