# ilo web

The Astro site and public Cloudflare Worker tool API for ilo.so.

## Local development

```sh
pnpm -C apps/web dev
```

The public pages, blog posts, report guides, and tools are rendered by Astro. Runtime API routes are limited to the free X, Bluesky, and link-preview tools under `/api/tools`.

## Optional environment

Copy `.dev.vars.example` to `.dev.vars` only if you use a self-hosted FXTwitter-compatible endpoint:

```txt
FX_BASE_URL=https://api.fxtwitter.com
FX_AUTH_HEADER=
FX_AUTH_VALUE=
```

## Checks

```sh
pnpm -C apps/web typecheck
pnpm -C apps/web test
pnpm -C apps/web build
pnpm -C apps/web exec wrangler deploy --dry-run
```

The generated Worker must not contain D1, KV, R2, queue, auth, or billing bindings.

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/iannuttall/ilo/tree/main/apps/web)

The template deploys to a `workers.dev` URL. Add a custom domain from your own Cloudflare dashboard if you want one.

## SEO parity

Start the site on port 8787, then compare it with the saved pre-open-source ilo.so baseline:

```sh
pnpm -C apps/web dev
pnpm seo:parity
```

Use `pnpm seo:parity -- --live` while the old production site is still available. The check crawls sitemap and internally linked routes, then compares statuses, redirects, canonicals, indexability, metadata, structured data, and material content loss.
