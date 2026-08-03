# Personal Site Hub (ugurkc.github.io) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A hub site at `ugurkc.github.io` with a bio and a YAML-driven publishings list, where each publishing links to an essay deployed from its own repo (e.g. `/watershed/`).

**Architecture:** Multi-repo with native GitHub Pages paths — a new `ugurkc/ugurkc.github.io` repo (Astro, one index page, publishings from `src/data/publishings.yaml`) serves the root; existing project repos like `ugurkc/watershed` keep serving under `/<repo-name>/` with their own Actions deploys. Design doc: `docs/plans/2026-08-03-personal-site-hub-design.md`.

**Tech Stack:** Astro 7 (bumped from 5 during Task 1 code review — security advisories are only patched in 7.1.6+), `@rollup/plugin-yaml` (YAML import), Vitest (data-file validation), GitHub Actions Pages deploy (same shape as Watershed's `deploy.yml`).

**Repos touched:**
- NEW: `/Users/ugurkoc/repos/ugurkc.github.io` → `github.com/ugurkc/ugurkc.github.io`
- EXISTING: `/Users/ugurkoc/repos/markov-transitions` (= `github.com/ugurkc/watershed`) — Task 6 only

**Hard rules:**
- NEVER add `Co-Authored-By` / "Generated with Claude Code" trailers to commits (user rule).
- The watershed repo has an unrelated uncommitted change in `src/state/useSimulation.ts`. Never `git add -A` there; stage only the files each task names.
- No worktree needed: Tasks 1–5 build a brand-new repo; Task 6 is a two-file cosmetic change on watershed main.

---

### Task 1: Scaffold the hub repo locally

**Files (all under `/Users/ugurkoc/repos/ugurkc.github.io`):**
- Create: `.gitignore`, `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`

**Step 1: Create the directory and init git**

```bash
mkdir -p /Users/ugurkoc/repos/ugurkc.github.io/src
cd /Users/ugurkoc/repos/ugurkc.github.io
git init -b main
```

**Step 2: Write `.gitignore`**

```
node_modules/
dist/
.astro/
.DS_Store
```

**Step 3: Write `package.json`**

```json
{
  "name": "ugurkc.github.io",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "astro": "^7.1.6"
  },
  "devDependencies": {
    "@rollup/plugin-yaml": "^4.1.2",
    "vitest": "^4.1.10"
  }
}
```

**Step 4: Write `astro.config.mjs`**

`site` enables correct canonical URLs; the yaml plugin makes `import data from './x.yaml'` work in pages, and (via `getViteConfig` later) in tests.

```js
import { defineConfig } from 'astro/config'
import yaml from '@rollup/plugin-yaml'

export default defineConfig({
  site: 'https://ugurkc.github.io',
  vite: {
    plugins: [yaml()],
  },
})
```

**Step 5: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "src/**/*"],
  "exclude": ["dist"]
}
```

**Step 6: Write `src/env.d.ts`** (lets TypeScript accept the YAML import)

```ts
declare module '*.yaml' {
  const data: any
  export default data
}
```

**Step 7: Install and verify**

Run: `npm install && npx astro --version`
Expected: prints an Astro 7.x version, no errors.

**Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json astro.config.mjs tsconfig.json src/env.d.ts
git commit -m "Scaffold Astro site"
```

---

### Task 2: Publishings data file, validation test first

The YAML file is the site's "easily amendable" surface — the test guards its shape so a future hand-edit can't silently break the page. TDD: write the test before the data file exists.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/data/publishings.test.ts`
- Create: `src/data/publishings.yaml`

**Step 1: Write `vitest.config.ts`**

`getViteConfig` from Astro applies the same Vite pipeline (including the yaml plugin) to Vitest — without it the test cannot import `.yaml`.

```ts
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

**Step 2: Write the failing test `src/data/publishings.test.ts`**

Gotcha this test enforces: in YAML, an unquoted `2026-08-03` parses as a JS `Date` object, not a string. Dates in `publishings.yaml` must be quoted — the test pins that down.

```ts
import { describe, expect, it } from 'vitest'
import publishings from './publishings.yaml'

interface Publishing {
  title: string
  description: string
  date: string
  url: string
}

const entries = publishings as Publishing[]

describe('publishings.yaml', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('every entry has title, description, date, url', () => {
    for (const entry of entries) {
      const label = JSON.stringify(entry)
      expect(entry.title, label).toBeTruthy()
      expect(entry.description, label).toBeTruthy()
      expect(entry.url, label).toBeTruthy()
      expect(typeof entry.date, `date must be a quoted string: ${label}`).toBe('string')
      expect(entry.date, label).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run`
Expected: FAIL — cannot resolve `./publishings.yaml`.

**Step 4: Write `src/data/publishings.yaml`**

```yaml
- title: Watershed
  description: >-
    An interactive essay on modeling player lifecycles as Markov chains —
    onboarding, engagement, churn, and win-back, with a live simulator.
  date: "2026-08-03"
  url: /watershed/
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run`
Expected: PASS (2 tests).

**Step 6: Commit**

```bash
git add vitest.config.ts src/data/publishings.test.ts src/data/publishings.yaml
git commit -m "Add publishings data file with shape validation"
```

---

### Task 3: Index page — bio + publishings list

**Files:**
- Create: `src/pages/index.astro`

**Step 1: Write `src/pages/index.astro`**

Complete file. The bio paragraph is a placeholder the user will edit (marked with a comment). Styles are inline in the page — the whole site is one page; a separate stylesheet would be indirection for nothing. Light/dark follows the OS via `prefers-color-scheme`.

```astro
---
import publishings from '../data/publishings.yaml'

interface Publishing {
  title: string
  description: string
  date: string
  url: string
}

const entries = (publishings as Publishing[]).slice().sort((a, b) => b.date.localeCompare(a.date))

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Uğur's personal site — bio and publishings." />
    <title>Uğur</title>
  </head>
  <body>
    <main>
      <header class="bio">
        <h1>Uğur</h1>
        <!-- EDIT ME: replace with your real bio -->
        <p>
          I build interactive essays and tools. This is my corner of the web —
          below is what I've published so far.
        </p>
      </header>

      <section class="publishings" aria-labelledby="publishings-heading">
        <h2 id="publishings-heading">Publishings</h2>
        <ul>
          {
            entries.map((p) => (
              <li>
                <a href={p.url}>
                  <span class="title">{p.title}</span>
                  <time datetime={p.date}>{formatDate(p.date)}</time>
                  <span class="description">{p.description}</span>
                </a>
              </li>
            ))
          }
        </ul>
      </section>
    </main>
  </body>
</html>

<style>
  :root {
    --ink: #16181d;
    --muted: #5f6572;
    --accent: #4f46e5;
    --paper: #f7f8fa;
    --card: #ffffff;
    --border: #e5e7eb;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --ink: #e8eaf0;
      --muted: #9aa1af;
      --accent: #8b85f4;
      --paper: #101116;
      --card: #181a21;
      --border: #2a2d38;
    }
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      'Segoe UI',
      Roboto,
      sans-serif;
    line-height: 1.6;
  }

  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 72px 24px 96px;
  }

  .bio h1 {
    margin: 0 0 14px;
    font-size: 2.2rem;
    font-weight: 750;
    letter-spacing: -0.02em;
  }

  .bio p {
    margin: 0;
    color: var(--muted);
    font-size: 1.05rem;
  }

  .publishings {
    margin-top: 56px;
  }

  .publishings h2 {
    margin: 0 0 18px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .publishings ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .publishings a {
    display: block;
    padding: 18px 20px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease;
  }

  .publishings a:hover {
    border-color: var(--accent);
  }

  .publishings .title {
    font-weight: 650;
    font-size: 1.1rem;
  }

  .publishings time {
    float: right;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .publishings .description {
    display: block;
    margin-top: 6px;
    font-size: 0.95rem;
    color: var(--muted);
  }
</style>
```

**Step 2: Build and verify output**

Run: `npm run build && grep -o 'href="/watershed/"' dist/index.html && grep -c 'Watershed' dist/index.html`
Expected: build succeeds; grep prints `href="/watershed/"` and a count ≥ 1.

**Step 3: Visual check (optional but recommended)**

Start the dev server and view `http://localhost:4321/` in the browser preview: bio on top, one publishing card linking to `/watershed/`. Check dark mode too. (When executing with Claude tools: add a `.claude/launch.json` entry rather than running the server via Bash.)

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "Add index page: bio and publishings list"
```

---

### Task 4: Deploy workflow + README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Step 1: Write `.github/workflows/deploy.yml`** (same shape as Watershed's; `npm run test` guards the YAML before deploying)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Write `README.md`**

```markdown
# ugurkc.github.io

Personal site: bio + publishings. Built with [Astro](https://astro.build),
deployed to GitHub Pages on every push to `main`.

## Amending the site

- **Add/edit a publishing:** edit `src/data/publishings.yaml` (one entry per
  publishing: `title`, `description`, `date` — quoted, `"YYYY-MM-DD"` — and
  `url`), then push. That's it.
- **Edit the bio:** edit the header section in `src/pages/index.astro`.

## Local development

    npm install
    npm run dev        # http://localhost:4321
    npm run test       # validates publishings.yaml shape
    npm run build      # output in dist/

## Publishing a new interactive essay

Each essay lives in its own repo and appears at
`ugurkc.github.io/<repo-name>/`:

1. Create the repo `ugurkc/<slug>`. Set the build's base path to `/<slug>/`
   (Vite: `base: '/<slug>/'` in `vite.config.ts`).
2. Copy `.github/workflows/deploy.yml` from the
   [watershed repo](https://github.com/ugurkc/watershed) into the new repo.
3. Enable Pages for the repo with source "GitHub Actions":
   `gh api repos/ugurkc/<slug>/pages -X POST -f build_type=workflow`
4. Push to `main` — the essay goes live at `ugurkc.github.io/<slug>/`.
5. Add an entry for it in `src/data/publishings.yaml` here and push.
```

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "Add Pages deploy workflow and README"
```

---

### Task 5: Create the GitHub repo, enable Pages, go live

**Step 1: Create the repo and push** (from `/Users/ugurkoc/repos/ugurkc.github.io`)

```bash
gh repo create ugurkc/ugurkc.github.io --public --source . --push --description "Personal site: bio + publishings"
```

**Step 2: Immediately set Pages source to GitHub Actions**

The push already triggered the workflow; the deploy job needs Pages enabled with `build_type=workflow`. Run right after the push:

```bash
gh api repos/ugurkc/ugurkc.github.io/pages -X POST -f build_type=workflow
```

If that returns 409 (Pages already exists — GitHub sometimes auto-enables for `*.github.io` repos):

```bash
gh api repos/ugurkc/ugurkc.github.io/pages -X PUT -f build_type=workflow
```

**Step 3: Watch the run; rerun if the deploy job lost the race**

```bash
gh run list --repo ugurkc/ugurkc.github.io --limit 1
gh run watch --repo ugurkc/ugurkc.github.io --exit-status $(gh run list --repo ugurkc/ugurkc.github.io --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: run succeeds. If only the `deploy` job failed (Pages wasn't enabled yet when it ran):

```bash
gh run rerun --repo ugurkc/ugurkc.github.io --failed $(gh run list --repo ugurkc/ugurkc.github.io --limit 1 --json databaseId --jq '.[0].databaseId')
```

**Step 4: Verify both URLs live**

```bash
curl -sL https://ugurkc.github.io/ | grep -o 'href="/watershed/"'
curl -s -o /dev/null -w "%{http_code}\n" https://ugurkc.github.io/watershed/
```

Expected: first prints `href="/watershed/"`; second prints `200`. CDN can lag ~1–2 minutes after the first deploy; retry before diagnosing.

---

### Task 6: Home link on the Watershed essay

Repo: `/Users/ugurkoc/repos/markov-transitions`. No component-test infra exists for React there (Vitest covers `src/lib` only) — adding jsdom/testing-library for one anchor tag is over-engineering. Verification = tests + build + visual.

**Files:**
- Modify: `src/App.tsx` (header at lines ~37–39)
- Modify: `src/index.css` (after the `.article-header` block at lines ~287–290)

**Step 1: Add the link in `src/App.tsx`**

In the `<header className="article-header" id="intro">` block, insert as the first child, above the eyebrow `<p>`:

```tsx
<a className="home-link" href="https://ugurkc.github.io/">
  ← ugurkc.github.io
</a>
```

**Step 2: Add styles in `src/index.css`**

Insert after the `.article-header` rule (line ~290):

```css
.home-link {
  display: inline-block;
  margin-bottom: 18px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: var(--muted);
}

.home-link:hover {
  color: var(--accent);
}
```

**Step 3: Verify tests and build**

Run: `npm run test && npm run build` (in `/Users/ugurkoc/repos/markov-transitions`)
Expected: tests pass, build succeeds.

**Step 4: Visual check** — dev server, confirm the link renders above "Player lifecycles as Markov chains" and looks right in both themes.

**Step 5: Commit ONLY the two files and push**

`src/state/useSimulation.ts` has unrelated uncommitted changes — do not stage it.

```bash
git add src/App.tsx src/index.css
git commit -m "Add home link to ugurkc.github.io in the essay header"
git push
```

**Step 6: Verify live** — after the watershed Action finishes (~1–2 min):

```bash
curl -sL https://ugurkc.github.io/watershed/ | grep -o 'ugurkc.github.io'
```

Expected: at least one match (the link is in the JS bundle or HTML; if not in HTML, check the deployed page in a browser instead — the app renders client-side, so prefer the browser check).

---

### Done criteria

- `https://ugurkc.github.io/` shows bio + a Watershed card linking to `/watershed/`.
- `https://ugurkc.github.io/watershed/` still works and now links back home.
- Adding a future publishing = one YAML entry in the hub + push (recipe in hub README).
