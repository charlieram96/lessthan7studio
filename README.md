# lessthan7.studio

The website for **lessthan7**, a design, development and SEO studio in Miami.
Built with [Astro](https://astro.build), GSAP and Lenis, hosted on Netlify.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve dist/
```

Node 22.22 or newer.

## How it's organized

| Path | What lives there |
| --- | --- |
| `src/pages/` | Home, work index, case studies (`work/[slug].astro`), services, studio, contact, privacy, 404, and the private `lab/` |
| `src/components/` | Header, footer, loader, the mark, and home page sections |
| `src/scripts/` | Client code: smooth scroll, the intro, scroll scenes, cursor, forms, lab and report |
| `src/data/projects.ts` | Case study copy, one entry per project |
| `src/data/audit/*.json` | Facts measured from each live site: Lighthouse, fonts, palette, schema, page weight |
| `public/work/<slug>/` | Screenshots for each project |
| `netlify/functions/` | The revamp lab's server: start a job, run it in the background, report status |
| `scripts/` | Screenshot capture, Open Graph images and the artifact preview build |

## Adding a project

1. Add the site to `scripts/sites.json`.
2. Capture screenshots and measurements:
   ```bash
   npx playwright install chromium   # once
   npm run capture -- <slug>
   ```
   This writes `public/work/<slug>/*.webp` and `src/data/audit/<slug>.json`.
3. Add the case study copy to `src/data/projects.ts`.
4. Render its social image: `npm run og -- <slug>`.

## The revamp lab (private)

`/lab/` is an internal sales tool, linked only from the “7” in the footer copyright line.
Give it a prospect’s URL and it:

1. reads and measures the homepage (title, headings, schema, alt text, sitemap and more),
2. optionally runs Google Lighthouse through PageSpeed Insights,
3. asks **Claude Opus 5.5** (effort `high`, with web search and web fetch) to research the business,
4. writes a structured analysis with findings, a search plan and three design directions,
5. designs a homepage mockup for each direction,
6. renders everything as a 16:9 report you can present and export with **Download PDF**
   (your browser’s print dialog, then “Save as PDF”).

The prospect can choose a direction from the report. Choices arrive as Netlify Form
submissions (`revamp-choice`) with a link back to the report.

### Environment variables (Netlify → Site configuration → Environment variables)

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Claude API key. Set a monthly spend limit on it in the Anthropic Console. |
| `LAB_ACCESS_CODE` | yes | Code staff enter in the lab. The lab stays locked until this is set. |
| `LAB_DAILY_LIMIT` | no | Reports allowed per day (default 20). |
| `PAGESPEED_API_KEY` | no | Adds real Lighthouse scores and a phone screenshot to each report. |
| `LAB_SIGNING_SECRET` | no | Signs internal job tokens. Falls back to the API key. |

Each report makes five Claude calls (research, strategy, one mockup per concept) on
Opus 5.5 at high effort. Expect roughly $2–4 per report (an estimate: web research and
three full-page mockups dominate); each report stores its measured cost in Netlify Blobs,
and the Anthropic Console shows actual spend. Server-side refusal fallbacks are enabled
(`fallbacks: "default"`).

The pipeline runs as a chain of background-function invocations (research → strategy →
three concepts in parallel), so every stage gets Netlify's full 15 minutes. A failed concept
is retried once; a stage that dies is reported as an error on the next status check, and a
report ships with whichever concepts succeeded.

Reports are stored in Netlify Blobs and stay reachable at their link.

### Forms

Netlify Forms handles `contact` and `revamp-choice`. Turn on email notifications in
Netlify → Forms → Form notifications.

## Preview build

`npm run build:artifact` builds a self-contained copy in `artifact/` with relative links,
used for sharing previews. Forms and the lab run in preview mode there.
