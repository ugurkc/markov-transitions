# Personal site hub at ugurkc.github.io — Design

**Date:** 2026-08-03
**Status:** Approved

## Goal

A personal space at `ugurkc.github.io`: the root URL shows a main page with a bio and a
list of publishings. Each publishing links to an interactive essay deployed from its own
repo under its own path (e.g. `ugurkc.github.io/watershed/`). The publishings list must
be easily amendable — adding a publishing should not require touching code.

## Architecture: multi-repo, native GitHub Pages paths

GitHub Pages natively provides the desired URL structure. A repo named
`ugurkc.github.io` serves the root domain; every other repo with Pages enabled serves at
`ugurkc.github.io/<repo-name>/`. No routing layer, no monorepo.

| Repo | URL | Role |
|---|---|---|
| `ugurkc/ugurkc.github.io` (new) | `ugurkc.github.io/` | Astro hub: bio + publishings list |
| `ugurkc/watershed` (unchanged) | `ugurkc.github.io/watershed/` | Interactive essay, already deployed with `base: '/watershed/'` |
| future `ugurkc/<slug>` | `ugurkc.github.io/<slug>/` | Future essays, one repo each |

## The hub site

A minimal Astro project with a single index page.

- **Bio:** a small section on the index page (component/markdown).
- **Publishings list:** driven by one data file, `src/data/publishings.yaml`, one entry
  per publishing with `title`, `description`, `date`, `url`. Amending the site = edit
  one YAML entry, push; Actions redeploys.
- Astro chosen over Jekyll/plain HTML: markdown-friendly, near-zero JS output, easy to
  grow into hosted blog posts later (content collections), same Actions deploy pattern
  Watershed already uses.

## Deployment

GitHub Actions workflow, same shape as Watershed's `deploy.yml`:
checkout → setup Node → install → build → `upload-pages-artifact` → `deploy-pages`.
Repo's Pages source set to "GitHub Actions". Push to main = live.

## Recipe for future essays (documented in hub README)

1. Create repo `ugurkc/<slug>`; set the build's base path to `/<slug>/`
   (Vite: `base: '/<slug>/'`).
2. Copy Watershed's `deploy.yml`; enable Pages → GitHub Actions.
3. Add one YAML entry to the hub's `publishings.yaml`.

## Small touch

Add a "← ugurkc.github.io" home link to the Watershed essay header so the essay and hub
feel like one space.

## Out of scope (YAGNI)

- Auto-discovering repos via the GitHub API (manual YAML list instead)
- Hosted blog posts on the hub (add later via Astro content collections if wanted)
- Custom domain
- RSS
