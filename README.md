# KashPrompt (Image -> Prompt)

This repo is a front-end app (`index.html`, `script.js`, `style.css`) that turns an uploaded image into a detailed prompt using the Google Gemini API.

## How the API key works

| Environment | Behavior |
|---------------|----------|
| **Deployed (e.g. Cloudflare Pages)** | Your Gemini key is stored only as the **`GEMINI_API_KEY` secret** on the server. The API key UI is hidden; users upload an image and click Generate. |
| **Local** (`localhost`, `127.0.0.1`, or opening `index.html` as a file) | The API key field is shown so you can paste a key and test without deploying. The key is kept in `localStorage` in your browser only. |

## Run locally

1. Open `index.html` in your browser, **or** use a dev server (recommended).
2. Enter a Gemini API key in the UI (local dev only).

## Deploy (hide your API key)

Deploy to **[Cloudflare Pages](https://developers.cloudflare.com/pages/)** so the included **Pages Function** at `/generate` can call Gemini with your secret.

1. Connect this repo to Cloudflare Pages (or push with Wrangler).
2. In the Cloudflare dashboard: **Settings → Environment variables** (or **Secrets**), add **`GEMINI_API_KEY`** with your [Google AI Studio](https://aistudio.google.com/apikey) key. Mark it as **secret** / encrypted.
3. Deploy. The static assets and `functions/generate.js` are deployed together.

**GitHub Pages** serves only static files; it cannot run this server function. Use Cloudflare Pages (or another host with serverless/API routes) if you want the key hidden.

## Notes

- The server tries models in order: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-flash-latest`.
- For local previews of the **production** build, use `wrangler pages dev` with `GEMINI_API_KEY` in `.dev.vars` (see Cloudflare docs).
