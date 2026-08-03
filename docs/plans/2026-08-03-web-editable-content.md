# Web-Editable Content (Sveltia CMS) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** All site texts (hub blog posts, bio, publishings list, Watershed essay prose) become editable from the browser via Sveltia CMS admin pages, publishing through git commits + CI, without touching code paths.

**Architecture:** Static `/admin/` pages (vendored Sveltia CMS, client-side git CMS, no server) in both repos, configured to edit only content files. Hub gains a blog content collection + pages; Watershed's essay prose extracts verbatim from JSX into per-section markdown rendered by react-markdown, with the sidebar derived from content. Every content path is guarded by CI tests that run before deploy. Design doc: `docs/plans/2026-08-03-web-editable-content-design.md`.

**Tech Stack:** Astro 7 content collections (glob loader + zod), `marked` (hub bio, build-time), `react-markdown` (essay bodies), `@sveltia/cms` (vendored), vitest.

**Repos:**
- HUB = `/Users/ugurkoc/repos/ugurkc.github.io` (github.com/ugurkc/ugurkc.github.io)
- WS = `/Users/ugurkoc/repos/markov-transitions` (github.com/ugurkc/watershed)

**Hard rules:**
- NEVER add `Co-Authored-By` / "Generated with Claude Code" trailers.
- NEVER create, request, or handle a GitHub token. The PAT is created and entered only by the site owner; docs (Task 9) explain how. Admin sign-in cannot be tested by us — verifying the admin page *loads* is the boundary.
- WS prose must be ported VERBATIM (gate in Task 6/7). Do not "improve" the text.
- Push order: hub tasks push at Task 5; WS tasks push at Task 8. No pushes before the task says so.

---

## Part A — Hub

### Task 1: Feed util + blog content collection (TDD)

**Files (HUB):**
- Create: `src/lib/feed.ts`, `src/lib/feed.test.ts`
- Create: `src/content.config.ts`
- Create: `src/content/blog/hello-world.md`

**Step 1: Write the failing test `src/lib/feed.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { mergeFeed } from './feed'

const pub = (title: string, date: string, url: string) => ({
  title, description: 'd', date, url,
})
const post = (id: string, date: string, draft = false) => ({
  id, data: { title: id, description: 'd', date, draft },
})

describe('mergeFeed', () => {
  it('merges publishings and posts sorted by date descending', () => {
    const items = mergeFeed(
      [pub('Watershed', '2026-08-03', '/watershed/')],
      [post('newer', '2026-09-01'), post('older', '2026-01-01')],
    )
    expect(items.map((i) => i.title)).toEqual(['newer', 'Watershed', 'older'])
  })

  it('maps post urls to /blog/<id>/', () => {
    const items = mergeFeed([], [post('my-post', '2026-05-01')])
    expect(items[0].url).toBe('/blog/my-post/')
  })

  it('excludes draft posts', () => {
    const items = mergeFeed([], [post('draft', '2026-05-01', true)])
    expect(items).toEqual([])
  })

  it('keeps publishings intact', () => {
    const items = mergeFeed([pub('W', '2026-08-03', '/watershed/')], [])
    expect(items[0]).toMatchObject({ title: 'W', url: '/watershed/' })
  })
})
```

**Step 2: Run `npx vitest run src/lib/feed.test.ts`** — Expected: FAIL (module not found).

**Step 3: Write `src/lib/feed.ts`**

```ts
export interface FeedItem {
  title: string
  description: string
  date: string
  url: string
}

interface PostLike {
  id: string
  data: { title: string; description: string; date: string; draft: boolean }
}

export function mergeFeed(publishings: FeedItem[], posts: PostLike[]): FeedItem[] {
  const postItems = posts
    .filter((p) => !p.data.draft)
    .map((p) => ({
      title: p.data.title,
      description: p.data.description,
      date: p.data.date,
      url: `/blog/${p.id}/`,
    }))
  return [...publishings, ...postItems].sort((a, b) => b.date.localeCompare(a.date))
}
```

**Step 4: Run the test again** — Expected: PASS (4 tests).

**Step 5: Write `src/content.config.ts`** (Astro content-layer collection; schema mirrors the publishings guard, incl. the calendar-rollover check)

```ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be quoted "YYYY-MM-DD"')
      .refine(
        (d) => new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d,
        'date must be a real calendar date',
      ),
    draft: z.boolean().default(false),
  }),
})

export const collections = { blog }
```

Verify against the installed Astro 7 docs (context7 or `node_modules/astro` types) that `glob` loader import and `defineCollection` signature match; adapt mechanically if the API differs, and note it.

**Step 6: Write the sample draft post `src/content/blog/hello-world.md`**

```markdown
---
title: Hello world
description: A draft post proving the blog pipeline works. Edit or delete me in /admin/.
date: "2026-08-03"
draft: true
---

This is a **draft** post. It renders at `/blog/hello-world/` but is not listed on
the homepage. Set `draft: false` in the admin to publish it.
```

**Step 7: Run `npm run test` (all) and `npx astro sync`** — Expected: tests pass; sync generates collection types without error.

**Step 8: Commit** — `git add src/lib/feed.ts src/lib/feed.test.ts src/content.config.ts src/content/blog/hello-world.md && git commit -m "Add blog collection and tested feed merge"`

---

### Task 2: Shared styles, blog page, homepage merge

**Files (HUB):**
- Create: `src/styles/base.css`, `src/pages/blog/[slug].astro`
- Modify: `src/pages/index.astro`

**Step 1: Extract shared tokens to `src/styles/base.css`** — move (do not duplicate) from `index.astro`'s `<style>`: the `:root` custom-prop block, the dark-mode `@media` override, `* { box-sizing }`, and the `body` rule. Keep everything page-specific (bio/publishings rules) scoped in `index.astro`. Import in the frontmatter: `import '../styles/base.css'`.

**Step 2: Write `src/pages/blog/[slug].astro`** — drafts DO get pages (unlisted-preview semantic):

```astro
---
import { getCollection, render } from 'astro:content'
import '../../styles/base.css'

export async function getStaticPaths() {
  const posts = await getCollection('blog')
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }))
}

const { post } = Astro.props
const { Content } = await render(post)
const formatted = new Date(`${post.data.date}T00:00:00Z`).toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
})
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={post.data.description} />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>" />
    <title>{post.data.title} — Uğur</title>
  </head>
  <body>
    <main>
      <a class="back" href="/">← ugurkc.github.io</a>
      <article>
        <header>
          <h1>{post.data.title}</h1>
          <time datetime={post.data.date}>{formatted}</time>
        </header>
        <div class="prose"><Content /></div>
      </article>
    </main>
  </body>
</html>

<style>
  main { max-width: 640px; margin: 0 auto; padding: 48px 24px 96px; }
  .back { display: inline-block; margin-bottom: 40px; font-size: 13px; font-weight: 600;
    text-decoration: none; color: var(--muted); }
  .back:hover, .back:focus-visible { color: var(--accent); }
  header h1 { margin: 0 0 6px; font-size: 2rem; font-weight: 750; letter-spacing: -0.02em; }
  header time { color: var(--muted); font-size: 0.9rem; }
  .prose { margin-top: 32px; }
  .prose :global(h2) { margin: 40px 0 12px; font-size: 1.3rem; }
  .prose :global(p) { margin: 0 0 16px; }
  .prose :global(a) { color: var(--accent); }
  .prose :global(code) { background: var(--card); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px; font-size: 0.9em; }
  .prose :global(pre) { background: var(--card); border: 1px solid var(--border);
    border-radius: 8px; padding: 14px 16px; overflow-x: auto; }
  .prose :global(blockquote) { margin: 0 0 16px; padding-left: 14px;
    border-left: 3px solid var(--border); color: var(--muted); }
</style>
```

**Step 3: Update `src/pages/index.astro`** — frontmatter gains:

```ts
import { getCollection } from 'astro:content'
import { mergeFeed } from '../lib/feed'
// existing publishings import stays
const posts = await getCollection('blog')
const entries = mergeFeed(publishings as FeedItem[], posts)
```

Replace the old inline `.slice().sort(...)` with `mergeFeed` (the util owns sorting now). The template keeps rendering `entries` unchanged. Remove the moved base rules from the page `<style>`.

**Step 4: Verify** — `npm run test && npm run build`, then:
- `test -f dist/blog/hello-world/index.html && echo page-exists` → `page-exists` (draft page renders)
- `grep -c 'hello-world' dist/index.html` → `0` (draft not listed on homepage)
- `grep -o 'href="/watershed/"' dist/index.html` → still present

**Step 5: Commit** — `git add src/styles/base.css src/pages/blog src/pages/index.astro && git commit -m "Add blog pages and merge posts into the homepage feed"`

---

### Task 3: Bio extraction

**Files (HUB):**
- Create: `src/data/bio.md`
- Modify: `src/pages/index.astro`, `package.json` (adds `marked`)

**Step 1: `npm install marked`** (build-time only; zero client JS).

**Step 2: Write `src/data/bio.md`** with the CURRENT bio text verbatim (read it from `index.astro` — the paragraph inside `header.bio`):

```markdown
I build interactive essays and tools. This is my corner of the web —
below is what I've published so far.
```

**Step 3: Update `index.astro`** — frontmatter: `import { marked } from 'marked'` and `import bioRaw from '../data/bio.md?raw'`; `const bioHtml = marked.parse(bioRaw)`. Template: replace the hardcoded `<p>…</p>` and the `<!-- EDIT ME -->` comment with `<div class="bio-text" set:html={bioHtml} />`. Restyle `.bio p` selector to `.bio-text :global(p)` (same rules). Trusted content — `set:html` is fine here.

**Step 4: Verify** — `npm run build && grep -c "corner of the web" dist/index.html` → `1`. `npm run test` green.

**Step 5: Commit** — `git add src/data/bio.md src/pages/index.astro package.json package-lock.json && git commit -m "Move bio into editable markdown"`

---

### Task 4: Hub admin (Sveltia) + config test

**Files (HUB):**
- Create: `public/admin/index.html`, `public/admin/config.yml`, `public/admin/sveltia-cms.js` (vendored), `public/robots.txt`
- Create: `src/lib/adminConfig.test.ts`

**Step 1: Vendor Sveltia** — `npm install -D @sveltia/cms`, then copy the built bundle: `cp node_modules/@sveltia/cms/dist/sveltia-cms.js public/admin/sveltia-cms.js` (verify the exact dist filename in the package; commit the copy). Note the version in the commit body's first line? No — record it as a comment in `index.html`.

**Step 2: Write `public/admin/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Content admin</title>
  </head>
  <body>
    <!-- Sveltia CMS, vendored from @sveltia/cms (see package.json devDependencies for version) -->
    <script src="./sveltia-cms.js" type="module"></script>
  </body>
</html>
```

**Step 3: Write `public/admin/config.yml`**

```yaml
backend:
  name: github
  repo: ugurkc/ugurkc.github.io
  branch: main

media_folder: public/uploads
public_folder: /uploads

collections:
  - name: blog
    label: Blog posts
    folder: src/content/blog
    create: true
    extension: md
    slug: "{{slug}}"
    sortable_fields:
      fields: [date, title]
      default: { field: date, direction: descending }
    fields:
      - { name: title, label: Title, widget: string }
      - { name: description, label: Description, widget: text }
      - { name: date, label: "Date (YYYY-MM-DD)", widget: string, pattern: ['^\d{4}-\d{2}-\d{2}$', 'Use YYYY-MM-DD'] }
      - { name: draft, label: "Draft (unlisted)", widget: boolean, default: true }
      - { name: body, label: Body, widget: markdown }

  - name: site
    label: Site
    files:
      - name: publishings
        label: Publishings list
        file: src/data/publishings.yaml
        fields:
          - name: publishings
            label: Publishings
            widget: list
            fields:
              - { name: title, label: Title, widget: string }
              - { name: description, label: Description, widget: text }
              - { name: date, label: "Date (YYYY-MM-DD)", widget: string, pattern: ['^\d{4}-\d{2}-\d{2}$', 'Use YYYY-MM-DD'] }
              - { name: url, label: "URL (/slug/ or https://…)", widget: string, pattern: ['^(\/|https?:\/\/)', 'Start with / or http(s)://'] }
      - name: bio
        label: Bio
        file: src/data/bio.md
        fields:
          - { name: body, label: Bio text, widget: markdown }
```

CAUTION — root-list YAML: `publishings.yaml` is a top-level LIST, and Decap-style file collections expect a top-level map. Verify how Sveltia handles a root-list file (check Sveltia docs via context7/web). If unsupported, restructure to `src/data/publishings.yaml` with a top-level `publishings:` key and update `index.astro`'s import (`publishings.publishings`), `publishings.test.ts`, and the feed accordingly — mechanical, but MUST keep the existing tests' guards. Report which path you took.

**Step 4: Write `public/robots.txt`**

```
User-agent: *
Disallow: /admin/
Disallow: /watershed/admin/
```

**Step 5: Write `src/lib/adminConfig.test.ts`** — guards config↔repo drift:

```ts
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import config from '../../public/admin/config.yml'

const root = resolve(__dirname, '../..')

describe('admin config', () => {
  it('targets this repo on main', () => {
    expect(config.backend).toMatchObject({ name: 'github', repo: 'ugurkc/ugurkc.github.io', branch: 'main' })
  })

  it('every collection path exists', () => {
    for (const c of config.collections) {
      if (c.folder) expect(existsSync(resolve(root, c.folder)), c.folder).toBe(true)
      for (const f of c.files ?? []) expect(existsSync(resolve(root, f.file)), f.file).toBe(true)
    }
  })

  it('blog fields match the content schema', () => {
    const blog = config.collections.find((c: { name: string }) => c.name === 'blog')
    const names = blog.fields.map((f: { name: string }) => f.name)
    expect(names).toEqual(['title', 'description', 'date', 'draft', 'body'])
  })
})
```

(The vite yaml plugin transforms the `?`-less `.yml` import; confirm the import works from `public/` — if the plugin only matches `.yaml`, rename nothing: import with `../../public/admin/config.yml?raw` and parse using the `yaml` package as a devDependency instead. Report which.)

**Step 6: Run `npm run test`** — all green (feed, publishings, admin-config). `npm run build` green.

**Step 7: Commit** — `git add public/admin public/robots.txt src/lib/adminConfig.test.ts package.json package-lock.json && git commit -m "Add Sveltia admin for blog, publishings, and bio"`

---

### Task 5: Hub deploy + live verify

**Step 1:** `git push` (from HUB). Watch: `gh run watch --repo ugurkc/ugurkc.github.io --exit-status $(gh run list --repo ugurkc/ugurkc.github.io --limit 1 --json databaseId --jq '.[0].databaseId')` — success.

**Step 2: Live checks (curl):**
- `curl -s -o /dev/null -w "%{http_code}\n" https://ugurkc.github.io/admin/` → 200
- `curl -s https://ugurkc.github.io/robots.txt` → the disallow lines
- `curl -s -o /dev/null -w "%{http_code}\n" https://ugurkc.github.io/blog/hello-world/` → 200
- `curl -s https://ugurkc.github.io/ | grep -c hello-world` → 0
- `curl -s https://ugurkc.github.io/ | grep -o 'href="/watershed/"'` → present

(CDN may lag 1–2 min; retry.) The coordinator does the browser check of `/admin/` (login screen renders) — do not attempt sign-in.

---

## Part B — Watershed

### Task 6: Prose extraction — content files + loader (TDD, verbatim gate)

**Files (WS):**
- Create: `src/lib/essayContent.ts`, `src/lib/essayContent.test.ts`
- Create: `src/content/meta.md`, `src/content/sections/01-opening.md` … `07-caveats.md`

**Source of truth:** `src/App.tsx` at current HEAD. Header text: lines 41–52 (eyebrow, title, subtitle). Sections: lines 55–293 (7 `<section>` blocks). Sidebar labels: the `SECTIONS` array, lines 14–21.

**Entity/JSX → markdown conversion table (apply EXACTLY, nothing else):**
| JSX | Markdown |
|---|---|
| `<strong>x</strong>` | `**x**` |
| `<em>x</em>` | `*x*` |
| `&rsquo;` | `’` |
| `&ldquo;` / `&rdquo;` | `“` / `”` |
| `&mdash;` | `—` |
| `&rarr;` | `→` |
| `{' '}` and JSX line-wrap whitespace | single space |

**Section files** (frontmatter `order`; `id`/`label`/`heading` only where the JSX has them):

| File | order | id | label | heading |
|---|---|---|---|---|
| 01-opening.md | 1 | — | — | — |
| 02-states-and-transitions.md | 2 | states-and-transitions | States and transitions | States and transitions |
| 03-transition-matrix.md | 3 | transition-matrix | The transition matrix | The transition matrix |
| 04-try-it.md | 4 | try-it | Try it yourself | Try it: build your own player lifecycle |
| 05-absorbing-states.md | 5 | absorbing-states | Absorbing states: churn | Absorbing states: modeling churn |
| 06-steady-state.md | 6 | steady-state | Steady state: win-back | Steady state: modeling win-back |
| 07-caveats.md | 7 | — | — | — |

`src/content/meta.md`: frontmatter `eyebrow: Player lifecycles as Markov chains`, `title: Watershed`; body = the subtitle paragraph as markdown.

**Step 1: Write the failing tests `src/lib/essayContent.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { loadMeta, loadSections } from './essayContent'

describe('essay content', () => {
  const sections = loadSections()

  it('loads at least one section, sorted by order', () => {
    expect(sections.length).toBeGreaterThan(0)
    const orders = sections.map((s) => s.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('orders are unique numbers', () => {
    const orders = sections.map((s) => s.order)
    expect(new Set(orders).size).toBe(orders.length)
    for (const o of orders) expect(Number.isFinite(o)).toBe(true)
  })

  it('ids are unique and url-safe', () => {
    const ids = sections.map((s) => s.id).filter(Boolean) as string[]
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
  })

  it('every section with a sidebar label has an anchor id', () => {
    for (const s of sections) {
      if (s.label) expect(s.id, `section order ${s.order} has label but no id`).toBeTruthy()
    }
  })

  it('bodies are non-empty prose', () => {
    for (const s of sections) expect(s.body.trim().length, `order ${s.order}`).toBeGreaterThan(40)
  })

  it('meta has eyebrow, title, and subtitle body', () => {
    const meta = loadMeta()
    expect(meta.eyebrow).toBeTruthy()
    expect(meta.title).toBeTruthy()
    expect(meta.subtitle.trim().length).toBeGreaterThan(40)
  })
})
```

**Step 2: Run `npx vitest run src/lib/essayContent.test.ts`** — FAIL (module not found).

**Step 3: Write `src/lib/essayContent.ts`** (hand-rolled scalar frontmatter — our schema needs nothing more):

```ts
export interface EssaySection {
  order: number
  id?: string
  label?: string
  heading?: string
  body: string
}

export interface EssayMeta {
  eyebrow: string
  title: string
  subtitle: string
}

function parseFrontmatter(raw: string): { attrs: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { attrs: {}, body: raw }
  const attrs: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (kv) attrs[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim()
  }
  return { attrs, body: m[2].trim() }
}

const sectionFiles = import.meta.glob('../content/sections/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export function loadSections(): EssaySection[] {
  return Object.values(sectionFiles)
    .map((raw) => {
      const { attrs, body } = parseFrontmatter(raw)
      return {
        order: Number(attrs.order),
        id: attrs.id || undefined,
        label: attrs.label || undefined,
        heading: attrs.heading || undefined,
        body,
      }
    })
    .sort((a, b) => a.order - b.order)
}

import metaRaw from '../content/meta.md?raw'

export function loadMeta(): EssayMeta {
  const { attrs, body } = parseFrontmatter(metaRaw)
  return { eyebrow: attrs.eyebrow ?? '', title: attrs.title ?? '', subtitle: body }
}
```

**Step 4: Port the prose** into the 8 content files per the tables above. VERBATIM — no rewording, no "fixes".

**Step 5: Run the tests** — PASS. Also `npm run test` (full suite still green — nothing else touched yet).

**Step 6: VERBATIM GATE — normalize-and-diff script.** Write to the session scratchpad (NOT the repo), e.g. `<scratchpad>/prose-diff.mjs`:

```js
// usage: node prose-diff.mjs <repo-root>
// Compares prose text in HEAD's App.tsx vs the new markdown files.
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2]
const jsx = execSync('git show HEAD:src/App.tsx', { cwd: root, encoding: 'utf8' })

const normalize = (s) =>
  s
    .replace(/\{\s*'\s*'\s*\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&mdash;/g, '—').replace(/&rarr;/g, '→')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// JSX prose: header subtitle + all <section> blocks (lines between <article> and </article>), tags stripped
const article = jsx.slice(jsx.indexOf('<article'), jsx.indexOf('</article>'))
const jsxText = normalize(
  article
    .split('\n')
    .filter((l) => !/^\s*(import|const|export|\{\/\*)/.test(l))
    .join('\n')
    // strip pure-code fragments that aren't prose
    .replace(/← ugurkc\.github\.io/, '')
    .replace(/Source on GitHub/, ''),
)

const dir = join(root, 'src/content')
const mdText = normalize(
  ['meta.md', ...readdirSync(join(dir, 'sections')).sort().map((f) => `sections/${f}`)]
    .map((f) => readFileSync(join(dir, f), 'utf8').replace(/^---[\s\S]*?---/, ''))
    .join(' '),
)

// The JSX text additionally contains eyebrow/title/headings; the md side has headings in
// frontmatter. Compare as bags of words to be robust to ordering of header fields.
const bag = (t) => t.split(' ').filter(Boolean).sort().join('\n')
if (bag(jsxText) === bag(mdText)) {
  console.log('VERBATIM: OK')
} else {
  const a = new Set(jsxText.split(' ')), b = new Set(mdText.split(' '))
  console.log('ONLY IN JSX:', [...a].filter((w) => !b.has(w)).slice(0, 40))
  console.log('ONLY IN MD:', [...b].filter((w) => !a.has(w)).slice(0, 40))
  process.exit(1)
}
```

Run: `node <scratchpad>/prose-diff.mjs /Users/ugurkoc/repos/markov-transitions`
Expected: `VERBATIM: OK`. Account for legitimately code-side words (eyebrow/title/heading text appears in BOTH frontmatter and JSX — the word-bag comparison tolerates position, and headings/labels/eyebrow/title ARE in the md frontmatter which is stripped; so ADD them back: when building mdText, append the frontmatter `heading`, `eyebrow`, `title`, `label`... NOTE: labels do NOT appear in the article JSX (they're in SECTIONS) — append only `heading` values + meta eyebrow/title). Adjust the script until the comparison is apples-to-apples; the gate is that every PROSE word survives. If a genuine mismatch appears (a missing sentence, a typo introduced), fix the CONTENT FILES, never the script's honesty.

**Step 7: Commit** — `git add src/lib/essayContent.ts src/lib/essayContent.test.ts src/content && git commit -m "Extract essay prose into editable markdown sections"`

---

### Task 7: Render the essay from content

**Files (WS):**
- Modify: `src/App.tsx`, `package.json` (adds `react-markdown`)

**Step 1: `npm install react-markdown`**

**Step 2: Rewrite the article part of `App.tsx`:**

```tsx
import Markdown from 'react-markdown'
import { loadMeta, loadSections } from './lib/essayContent'

const META = loadMeta()
const ESSAY_SECTIONS = loadSections()
const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  ...ESSAY_SECTIONS.filter((s) => s.id && s.label).map((s) => ({ id: s.id!, label: s.label! })),
]
```

Header becomes:

```tsx
<header className="article-header" id="intro">
  <a className="home-link" href="https://ugurkc.github.io/">
    ← ugurkc.github.io
  </a>
  <p className="eyebrow">{META.eyebrow}</p>
  <h1>{META.title}</h1>
  <Markdown components={{ p: (props) => <p className="subtitle" {...props} /> }}>
    {META.subtitle}
  </Markdown>
</header>
```

The seven `<section>` blocks are replaced by:

```tsx
{ESSAY_SECTIONS.map((s) => (
  <section key={s.order} id={s.id}>
    {s.heading && <h2>{s.heading}</h2>}
    <Markdown>{s.body}</Markdown>
  </section>
))}
```

Footer and `<aside>` unchanged. Delete the now-unused hardcoded prose. `id={s.id}` with `undefined` renders no attribute — correct for the two unnamed sections.

**Step 3: Verify hard, in order:**
1. `npm run test` — full suite green (essayContent tests + all 128 existing).
2. `npm run lint` — clean.
3. `npm run build` — green.
4. Re-run the verbatim gate against the PREVIOUS commit's JSX: `node <scratchpad>/prose-diff.mjs` still says OK (it reads `git show HEAD~1:src/App.tsx` now — pass the ref as an arg or edit the script; the md side is unchanged so this mostly re-confirms nothing was lost in Step 2's deletion).
5. One-time anchor check: `node -e` a quick script (or grep the content files) asserting the id set is exactly `states-and-transitions, transition-matrix, try-it, absorbing-states, steady-state` — matches the pre-refactor SECTIONS array.

**Step 4: Commit** — `git add src/App.tsx package.json package-lock.json && git commit -m "Render essay prose from markdown content"`

Do NOT push yet (Task 8 pushes once, after the admin lands — one deploy, one live-diff).

---

### Task 8: Watershed admin + deploy + live verify

**Files (WS):**
- Create: `public/admin/index.html`, `public/admin/config.yml`, `public/admin/sveltia-cms.js` (vendored), `src/lib/adminConfig.test.ts`

**Step 1: Vendor Sveltia** exactly as in Task 4 (`npm install -D @sveltia/cms`, copy dist file). `public/admin/index.html` identical to the hub's (Vite copies `public/` into `dist/`, served at `/watershed/admin/`).

**Step 2: Write `public/admin/config.yml`**

```yaml
backend:
  name: github
  repo: ugurkc/watershed
  branch: main

media_folder: public/uploads
public_folder: /watershed/uploads

collections:
  - name: sections
    label: Essay sections
    folder: src/content/sections
    create: true
    extension: md
    sortable_fields:
      fields: [order]
      default: { field: order, direction: ascending }
    fields:
      - { name: order, label: Order, widget: number, value_type: int }
      - { name: id, label: "Anchor id (optional, e.g. transition-matrix)", widget: string, required: false, pattern: ['^[a-z][a-z0-9-]*$', 'lowercase-with-dashes'] }
      - { name: label, label: "Sidebar label (optional)", widget: string, required: false }
      - { name: heading, label: "Heading (optional)", widget: string, required: false }
      - { name: body, label: Body, widget: markdown }
  - name: meta
    label: Essay header
    files:
      - name: meta
        label: Header text
        file: src/content/meta.md
        fields:
          - { name: eyebrow, label: Eyebrow, widget: string }
          - { name: title, label: Title, widget: string }
          - { name: body, label: Subtitle, widget: markdown }
```

**Step 3: Write `src/lib/adminConfig.test.ts`** — same three guards as the hub version (backend repo `ugurkc/watershed`, paths exist, sections field names `[order, id, label, heading, body]`). WS has no vite yaml import plugin: `npm install -D yaml`, import the config with `?raw` and `parse()` from `yaml`.

**Step 4:** `npm run test` (all green) and `npm run build`; confirm `dist/admin/index.html` and `dist/admin/config.yml` exist.

**Step 5: Commit and push** — `git add public/admin src/lib/adminConfig.test.ts package.json package-lock.json && git commit -m "Add Sveltia admin for essay prose" && git push`

**Step 6: Watch the run** (same pattern as before) — success expected; the suite gates the whole refactor in CI.

**Step 7: Live verify:**
- `curl -s -o /dev/null -w "%{http_code}\n" https://ugurkc.github.io/watershed/admin/` → 200
- Coordinator does the decisive check in the browser: extract the live article `innerText` (captured BEFORE this deploy as the baseline) vs after — must be identical; anchors `#transition-matrix` etc. scroll correctly; both themes render; sidebar labels unchanged.

---

### Task 9: Documentation (both repos)

**Files:**
- Modify: HUB `README.md`, WS `README.md`

**HUB README** — add an "Editing content (no code)" section:
- Admin URLs: `https://ugurkc.github.io/admin/` (blog, publishings, bio) and `https://ugurkc.github.io/watershed/admin/` (essay prose).
- Sign-in: create a GitHub **fine-grained PAT** — Settings → Developer settings → Personal access tokens → Fine-grained; Repository access: only `ugurkc.github.io` and `watershed`; Permissions: **Contents: Read and write** (Metadata: read is added automatically). Paste it into Sveltia's sign-in once per browser. Never share this token; it can push to these two repos.
- Publishing model: Save = commit to main → tests run → live in ~1 min; a failing edit never deploys (check the repo's Actions tab if an edit doesn't appear).
- Blog: `draft: true` = unlisted preview at its URL; flip to false to list it.
- Maintenance: to update the CMS, `npm update @sveltia/cms` and re-copy `dist/sveltia-cms.js` into `public/admin/` in both repos.
- Update the new-essay recipe: optional step 6 — "for web-editable prose, copy the `src/content/` + `public/admin/` pattern from watershed (set `repo:` in config.yml to the new repo)".

**WS README** — short "Editing the essay text" section pointing at `/watershed/admin/`, the section/meta model, and the ordering rule (`order` field drives sequence; `label` present = shown in sidebar; `id` = anchor).

**Commit both** (each repo: `git add README.md && git commit -m "Document the content editing workflow" && git push`). Watch both runs green.

---

### Done criteria

- Hub: `/admin/` edits blog/publishings/bio; posts render at `/blog/<slug>/`; drafts unlisted; homepage merges feeds; all guarded by CI tests.
- Watershed: essay prose lives in `src/content/`, rendered identically (verbatim + live-text gates passed), sidebar derived, `/watershed/admin/` edits it; 128 pre-existing tests still green.
- Docs tell the owner exactly how to sign in and publish; token handling stays entirely with the owner.
