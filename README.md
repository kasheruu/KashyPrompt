# KashPrompt (Image -> Prompt)

This repo is a simple static front-end app (`index.html`, `script.js`, `style.css`) that reverse-engineers an uploaded image into a detailed prompt using the Google Gemini API.

## Run locally

1. Open `index.html` in your browser, **or** use a dev server (recommended).
2. For VS Code / Cursor, install the recommended **Live Server** extension and click “Go Live”.

## Gemini API key

Your API key is stored only in your browser via `localStorage` (you enter it in the UI). Avoid using a key that has access to sensitive projects.

## Notes / limitations

- Local development calls Gemini from the browser; public deployments use a Cloudflare Pages Function proxy so the key is not exposed to visitors.
- If Gemini responds with an unexpected structure, the UI will show an error message.

## Public deployment (Cloudflare Pages + Functions)

For public deployments, this project includes a Cloudflare Pages Function at `/generate` that calls Gemini server-side.

1. Deploy the repo to Cloudflare Pages (from GitHub).
2. In your Cloudflare Pages project, add a secret/binding named `GEMINI_API_KEY`.
3. Ensure your Function code is deployed (it lives in `functions/generate.js`).

After that, the website will hide the API key input automatically and use the server-side proxy.

