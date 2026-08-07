# Web-editable content via Sveltia CMS — Design

**Date:** 2026-08-03
**Status:** Approved

## Goal

The user edits and publishes all site *texts* from the browser; *code* continues to go
through git. Covers: new blog posts on the hub, the hub's bio and publishings list, and
the prose of interactive essays (Watershed now; future essays by the same pattern).

## Architecture

Both repos get a static `/admin/` page running **Sveltia CMS** — a client-side git CMS
(one vendored JS file + one YAML config, no server, no third-party service). The user
signs in with a GitHub fine-grained PAT (Contents read/write on both repos) that they
create themselves and that lives only in their browser. Every Save = commit to `main` →
CI runs the full test suite → deploy (~1 min). A bad edit fails CI; the live site stays
on the last good version.

| Surface | Edits |
|---|---|
| `ugurkc.github.io/admin/` | blog posts, publishings list, bio |
| `ugurkc.github.io/riverbed/admin/` | essay prose sections + header text |

CMS configs point exclusively at content paths — the CMS has no UI path to code files.

## Hub (ugurkc.github.io)

- **Blog posts:** markdown in `src/content/blog/`, frontmatter `title`, `description`,
  `date` (quoted `"YYYY-MM-DD"`), `draft`. Zod schema validates at build. Pages at
  `/blog/<slug>/` in a minimal layout sharing the homepage's design tokens.
  `draft: true` = unlisted-but-viewable (page exists, not in the homepage list) — acts
  as a shareable preview.
- **Homepage list:** chronological merge of `publishings.yaml` + non-draft posts, one
  card list. Merge/sort/draft logic extracted to a tested util.
- **Bio:** moves from hardcoded JSX-ish HTML to `src/data/bio.md`, rendered at build
  time with `marked` (trusted content, zero client JS).
- **Admin:** `public/admin/` with vendored `sveltia-cms.js`, collections for blog
  (folder), publishings (file, mirrors the YAML test schema), bio (file).
  `robots.txt` disallows admin paths.

## Watershed (essay prose extraction)

Verified by full read: the article is pure prose (`p`/`h2`/`strong`/`em` + typographic
entities); all interactives live in the separate `<aside>`. No MDX needed.

- **Content model:** `src/content/sections/*.md`, frontmatter `order` (number, drives
  sequence), optional `id` (preserves existing anchor slugs), optional `label`
  (sidebar text — differs from headings today), optional `heading`; body = the prose,
  ported verbatim (entities → real unicode). `src/content/meta.md` holds eyebrow,
  title, and the subtitle (markdown body). Home link and footer/repo link stay code.
- **Rendering:** Vite eager glob import + small frontmatter parser (tested);
  `react-markdown` renders bodies to the same DOM shape the CSS already styles.
  `SECTIONS` (sidebar) is **derived** from section files with a `label` — CMS edits
  cannot desync navigation.
- **Tests (CI-gated like the hub's YAML tests):** unique valid ids, unique orders,
  label⇒id, non-empty bodies, meta shape.
- **Admin:** `public/admin/` (served at `/riverbed/admin/`), collections: sections
  (folder, sorted by order), meta (file).

## Not breaking the essay — hard gates

1. Verbatim-text gate: normalize-and-diff the prose extracted from the old JSX vs the
   new markdown (script), plus a live-browser `innerText` diff of the rendered article
   before/after deploy. Must match.
2. All 128 existing tests keep passing (simulation/lib code untouched).
3. Anchor ids and sidebar labels preserved exactly (explicit frontmatter).
4. Visual check both themes before/after.
5. Every future CMS edit runs the full suite pre-deploy; any edit is one revert away.

## Out of scope (YAGNI)

RSS, editorial/branch workflows, draft preview URLs beyond the unlisted-page semantic,
og:image, retrofitting future essays automatically (they copy the pattern when wanted).
