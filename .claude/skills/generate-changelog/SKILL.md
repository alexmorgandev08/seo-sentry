---
name: generate-changelog
description: Build the next SEO Sentry release changelog by diffing the last released version against the upcoming code — new detections, plus New / Improved / Fixed items — then insert the entry at the top of the Changelog in readme.txt. Use when the user says "generate changelog", "build changelog", "make the changelog for the update", or invokes /generate-changelog.
---

# Generate Changelog

Produces the `= vX.Y.Z (Mon DD, YYYY) =` block for a plugin update and writes it into
`readme.txt`. The contents come from git, not memory: what shipped = the last
released version; what's about to ship = `main` (plus any unmerged work the
user names).

## Refs

- **Head** (next release): `origin/main`. Run `git fetch origin --tags -q` first.
- **Base** (last release): the latest git tag — `git describe --tags --abbrev=0 origin/main`.
  Tags are created by `.github/workflows/deploy.yml` when a GitHub release is
  published, so every release after the first has one.
- **No tag yet?** There is no `release` branch in this repo. Ask the user which
  commit shipped as the version in `readme.txt`'s `Stable tag`, and suggest tagging
  it (`git tag 1.0.0 <sha> && git push origin 1.0.0`) so the next run finds it.
  The published code itself lives in WordPress.org SVN at
  `plugins.svn.wordpress.org/seo-sentry/tags/<version>/` if a check is needed.
- If the user names other refs, use those and say which pair you compared.

## Output format

Match the existing entries in `readme.txt` — `v`-prefixed version and release
date in the heading (same as Bit Flows), flat bullets:

```
= vX.Y.Z (Mon DD, YYYY) =

* New: <sentence>.
* Improved: <sentence>.
* Fixed: <sentence>.
```

Rules:
- Order bullets New → Improved → Fixed.
- One plain sentence per bullet, ending in a period, written for a site owner
  (what they will notice), not for a developer.
- Drop any group with no items.
- Name new detections by what they catch ("Detects when a page's hreflang tags
  change"), not by their constant name.

## Steps

### 1. New detections
Detections are the `public const NAME = 'slug';` entries in
`backend/app/Services/CheckEngine/ChangeTypes.php`. List slugs in Head but not Base:
```bash
F=backend/app/Services/CheckEngine/ChangeTypes.php
comm -13 \
  <(git show <base>:$F | grep -oE "public const [A-Z_]+ *= *'[a-z_]+'" | grep -oE "'[a-z_]+'" | sort) \
  <(git show origin/main:$F | grep -oE "public const [A-Z_]+ *= *'[a-z_]+'" | grep -oE "'[a-z_]+'" | sort)
```
Each becomes a **New:** bullet. For wording, read the `what` line of the
matching entry in `backend/app/Services/Findings/ExplanationRegistry.php` — it
already describes the change in plain English. Entries are keyed by constant,
not slug: slug `title_changed` → `ChangeTypes::TITLE_CHANGED`.

### 2. Commits since Base
```bash
git log <base>..origin/main --format='%s'
```
Subjects here are mixed: most are conventional (`feat:`, `fix:`, `refactor:`,
`chore:`), some are not ("Rename plugin to SEO Sentry"). Read them all.

Bucketing:
- **New** — user-facing capabilities: new screens, settings, checks, WP-CLI
  commands, bulk actions.
- **Improved** — changes to something that already existed: clearer labels,
  layout, performance, better defaults. Many are tagged `refactor:` here.
- **Fixed** — `fix:` commits with a visible effect.
- **Skip** — `chore:`, version bumps, CI/workflow files, readme-only edits,
  test/tooling changes, and anything under `.claude/` or `.wordpress-org/`.

### 3. Check the diff, not only the subjects
Commit subjects in this repo can cancel out — e.g. a label renamed and then
renamed back. Before keeping a bullet, confirm the change survives in the net diff:
```bash
git diff <base>..origin/main --stat
git diff <base>..origin/main -- <path>
```
Drop items whose net effect is zero. Merge related commits into one bullet.

### 4. Leave out pro
Webhooks, Slack, AI explanations and the client report belong to the separate
pro add-on repo. Do not list them here even if free-side plumbing for them changed.

### 5. Version
- Current version: `grep -m1 "^Stable tag:" readme.txt`.
- Default bump: **minor** (`1.0.x` → `1.1.0`) if there is any New item;
  **patch** (`1.0.0` → `1.0.1`) for Improved/Fixed only.
- Date = the planned release date, formatted `Mon DD, YYYY` (e.g. `Sep 22, 2026`).
  Default to today. If the release slips to a later day, update the heading's
  date before publishing.
- **Confirm the version and date with the user before writing** — the bump
  rule is a guess.
- The `v` is only in the readme heading. Git tags stay plain (`1.0.1`).

### 6. Write into readme.txt
Insert the block directly under `== Changelog ==`, above the current top
`= v…` entry, with a blank line between entries. Show the user the block
first; write only after they confirm.

### 7. Hand off the release
Remind the user of the rest of the release, in order:
1. `pnpm update-ver -v X.Y.Z` — sets the version in `seo-sentry.php`,
   `readme.txt` (Stable tag), `package.json` and `backend/app/Config.php`.
2. Commit and push to `main`.
3. Publish a GitHub release tagged `X.Y.Z` (no `v`). `deploy.yml` refuses to
   deploy if the tag, the plugin header and the Stable tag disagree.

## Notes
- Shell: run each `git show … | grep` pipeline as its own command; do not store
  file contents in a shell variable first (zsh mangles the quoted patterns).
- Report the ref pair you used, the new-detection list, and the proposed
  version so the user can sanity-check before the file is edited.
