# KashPrompt (Image -> Prompt)

This repo is a front-end app in **`public/`** (`index.html`, `script.js`, `style.css`) that turns an uploaded image into a detailed prompt using the Google Gemini API.

## How the API key works

| Environment | Behavior |
|---------------|----------|
| **Deployed** | Your Gemini key is only **`GEMINI_API_KEY`** (secret) on Cloudflare. The API key UI is hidden; visitors upload an image and click Generate. |
| **Local** (`localhost`, `127.0.0.1`, or `file:`) | The API key field is shown for testing. The key stays in `localStorage` in your browser only. |

## Run locally

1. Open **`public/index.html`** in your browser, **or** run a dev server with **`public/`** as the site root (recommended), e.g. `npx serve public`.
2. Enter a Gemini API key in the UI (local dev only).

## Deploy (hide your API key)

You need a host that can run server-side code. This repo supports two Cloudflare options:

### A) Cloudflare Workers + static assets (`*.workers.dev`)

If your site is on **`something.workers.dev`**, **Pages Functions in `functions/` are not used**. You must deploy the **Worker** in `worker.js`, which implements `POST /generate` and serves your static files.

**Requires [Node.js LTS](https://nodejs.org/)** (so `npm` works in your terminal).

From the repo root:

1. `npm install` — installs Wrangler locally (see `package.json`).
2. `npx wrangler login` — sign in to Cloudflare (browser).
3. **`npm run deploy` first** — Cloudflare requires at least one successful deployment before you can add secrets with the CLI. The first deploy may run without `GEMINI_API_KEY`; `/generate` will error until step 4 is done.
4. `npm run secret` — paste your [Google AI Studio](https://aistudio.google.com/apikey) key when prompted (stored only in Cloudflare).
5. `npm run deploy` again — so the Worker picks up the new secret (or Cloudflare may apply it automatically; redeploy if `/generate` still says the key is missing).

**If `wrangler secret put` still fails**, add **`GEMINI_API_KEY`** in the dashboard: **Workers & Pages** → your worker **kashprompt** → **Settings** → **Variables and secrets** → **Add** → **Secret**, then save and deploy the version the UI offers.

Alternatively: install Wrangler globally (`npm i -g wrangler`) and run `wrangler deploy` before `wrangler secret put GEMINI_API_KEY`.

Confirm **Variables and secrets** lists **`GEMINI_API_KEY`** for this Worker.

`wrangler.toml` sets `main = "worker.js"` and **`[assets] directory = "./public"`** so deploy only uploads the UI (not `node_modules`). `/functions/*` is not exposed as public static files.

### B) Cloudflare Pages (`*.pages.dev`)

1. Connect the repo to [Cloudflare Pages](https://developers.cloudflare.com/pages/).
2. Set **Build** configuration: **Build output directory** = **`public`** (and no build command, or a no-op), so the site root is the contents of `public/`.
3. Add **`GEMINI_API_KEY`** under **Settings → Environment variables** (as a **secret**).
4. Deploy. The **Pages Function** at `functions/generate.js` handles `/generate`.

**GitHub Pages** cannot run `/generate`; use Cloudflare Workers or Pages (or another serverless host).

## Notes

- Models are tried in order: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-flash-latest`.
- For local testing against the server handler: `wrangler dev` or `wrangler pages dev` with `GEMINI_API_KEY` in `.dev.vars` (see Cloudflare docs).
