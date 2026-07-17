# ilo web

The statically generated Astro site and minimal Cloudflare Worker for ilo.so.

## Local development

```sh
pnpm -C apps/web dev
```

Marketing pages, blog posts, report guides, docs, and tool shells are prerendered. The Worker only handles legacy redirects and the same-origin X, Bluesky, and link-preview requests made by the browser tools under `/api/tools`.

Those routes are website plumbing, not a documented API. Direct and cross-origin callers receive a `404`.

## Optional environment

Copy `.dev.vars.example` to `.dev.vars` only when overriding the default
public-data endpoint. The example lists the available variables.

## Checks

```sh
pnpm -C apps/web typecheck
pnpm -C apps/web test
pnpm -C apps/web build
pnpm -C apps/web exec wrangler deploy --dry-run
```

The generated Worker must not contain D1, KV, R2, queue, auth, or billing bindings. The build also emits a Markdown version of every static page, `llms.txt`, `agent-routes.json`, and the published ilo skill.

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/iannuttall/ilo/tree/main/apps/web)

The template deploys to a `workers.dev` URL. Add a custom domain from your own Cloudflare dashboard if you want one.

See [CLOUDFLARE.md](CLOUDFLARE.md) for the ilo.so Git build settings, canonical-domain redirect, and the Transform Rules which serve prebuilt Markdown when an agent sends `Accept: text/markdown`.

## SEO parity

Start the site on port 8787, then compare it with the saved pre-open-source ilo.so baseline:

```sh
pnpm -C apps/web dev
pnpm seo:parity
```

Use `pnpm seo:parity -- --live` while the old production site is still available. The check crawls sitemap and internally linked routes, then compares statuses, redirects, canonicals, indexability, metadata, structured data, and material content loss.
