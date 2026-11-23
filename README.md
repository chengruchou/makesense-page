# MakeSense project page

The project page of the paper, an [Astro](https://astro.build) site with a few Preact
islands: the method stepper, the sensor picker, the dataset tabs and the fault viewer.
The clips in `public/media/` render the sensor inputs and stored model outputs; the
numbers come from the paper. The code is in its own repository.

```bash
npm ci             # Node 24
npm run dev        # http://localhost:4321
npm run check      # type-check
npm run build      # static site in dist/
```

| What | Where |
|---|---|
| The page and its sections | `src/pages/index.astro` |
| Interactive parts | `src/components/*.tsx` |
| Dataset text, numbers and clip lists | `src/data/` |
| Styles and colour tokens | `src/styles/` |
| Videos and posters | `public/media/` |

## Deploy

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the site on every
push to `main` and publishes it with GitHub Pages (Settings > Pages > Source: GitHub
Actions). It passes the Pages origin and base path (`SITE_URL`, `SITE_BASE`), so the page
works under `/<repository>/`; a local build serves it at `/`.

Icons: [Lucide](https://lucide.dev) (ISC License). Fonts: Geist, Inter and JetBrains Mono
through Fontsource (SIL Open Font License).
