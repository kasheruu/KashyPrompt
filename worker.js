/**
 * Cloudflare Worker + static assets (wrangler deploy → *.workers.dev).
 * Serves files from public/ and handles POST /generate.
 * Pages Functions alone do not run on a Worker-only deploy — this file fixes 404 on /generate.
 */
import { handleGeneratePost, handleGenerateOptions } from './functions/gemini-handler.js';

const BLOCKED_PREFIXES = ['/functions/'];
const BLOCKED_PATHS = new Set([
  '/worker.js',
  '/wrangler.toml',
  '/README.md',
  '/.gitignore',
  '/_routes.json',
  '/.prettierrc.json',
  '/.prettierignore',
  '/.editorconfig'
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);

    if (pathname === '/generate') {
      if (request.method === 'OPTIONS') return handleGenerateOptions();
      if (request.method === 'POST') return handleGeneratePost(request, env);
      return new Response('Method Not Allowed', { status: 405 });
    }

    for (const p of BLOCKED_PREFIXES) {
      if (url.pathname.startsWith(p)) {
        return new Response('Not Found', { status: 404 });
      }
    }
    if (BLOCKED_PATHS.has(pathname)) {
      return new Response('Not Found', { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
