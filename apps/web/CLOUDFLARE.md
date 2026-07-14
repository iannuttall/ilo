# Cloudflare deployment

The marketing site, blog, docs, report guides, and browser tool shells are a
static Astro build. The build writes HTML pages, matching Markdown files,
discovery files, and response headers into `apps/web/dist/client`.

Cloudflare serves matching files as Workers Static Assets before considering
the Worker. `assets.run_worker_first` is explicitly `false`, so normal page and
asset requests do not invoke Worker code. Workers Caching is also disabled;
the static asset service provides its own free global cache.

The Worker is only used for:

- browser tool requests under `/api/tools/*`
- permanent redirects which do not have a static asset
- requests which do not match a static asset

## Git build settings

Use these settings for the `ilo-web` Worker. Keep the Wrangler `name` stable
after connecting the project because changing it creates another Worker.

| Setting | Value |
| --- | --- |
| Repository | `iannuttall/ilo` |
| Production branch | `main` |
| Root directory | Repository root (leave blank) |
| Build command | `pnpm build:web` |
| Deploy command | `pnpm deploy:web` |
| Non-production deploy command | `pnpm -C apps/web exec wrangler versions upload` |

If the Worker is still connected to the renamed `ilo-app` repository, open
**Settings**, then **Builds**, disconnect the old repository, and connect
`iannuttall/ilo` with the settings above.

The Deploy to Cloudflare button in `apps/web/README.md` creates a separate
`workers.dev` deployment for people using ilo as a template. The zone rules
below are only needed for the canonical `ilo.so` deployment.

## Canonical domain

Attach both custom domains to the Worker:

- `ilo.so`
- `www.ilo.so`

Create a permanent Redirect Rule which sends `www.ilo.so` to `ilo.so` while
preserving the path and query string. Keep **Always Use HTTPS** enabled for the
zone.

This redirect must be a zone rule. Static files bypass Worker code, so a host
redirect implemented only inside the Worker would not run for normal pages.

## Route Markdown requests at the edge

The build creates a static `.md` file for every canonical page. The following
URL Rewrite Rules let an agent request the normal page URL with
`Accept: text/markdown` and receive the prebuilt Markdown file without invoking
the Worker.

In Cloudflare open **Rules**, then **Transform Rules**, then **URL Rewrite
Rules**. Create the home-page rule before the content rule.

Use the Expression Editor. The visual expression builder cannot represent the
complete filters reliably.

### Rewrite the home page to Markdown

Use this rule expression:

```txt
(http.host eq "ilo.so" and http.request.uri.path eq "/" and (lower(http.request.headers["accept"][0]) eq "text/markdown" or starts_with(lower(http.request.headers["accept"][0]), "text/markdown,")))
```

Set **Path** to **Rewrite to Static**:

```txt
/index.md
```

Leave the query string unchanged.

### Rewrite content pages to Markdown

Use this rule expression:

```txt
(http.host eq "ilo.so" and http.request.uri.path ne "/" and not ends_with(http.request.uri.path, "/") and not ends_with(http.request.uri.path, ".md") and (http.request.uri.path eq "/docs" or (starts_with(http.request.uri.path, "/docs/") and http.request.uri.path ne "/docs/api") or http.request.uri.path eq "/reports" or starts_with(http.request.uri.path, "/reports/") or http.request.uri.path in {"/blog" "/blog/advanced-twitter-search" "/blog/pin-twitter-list" "/blog/remove-twitter-follower" "/blog/search-your-tweets" "/blog/social-media-metrics-dashboard" "/blog/track-twitter-followers" "/blog/tweet-analytics" "/blog/twitter-bio-ideas" "/blog/twitter-engagement-metrics" "/blog/twitter-follower-widget-ios" "/blog/twitter-impressions" "/blog/twitter-link-penalty" "/blog/twitter-spaces-analytics" "/bluesky-did" "/bluesky-id" "/bluesky-link-preview" "/changelog" "/pricing" "/privacy" "/terms" "/threads-link-preview" "/tools" "/twitter-advanced-search" "/twitter-card-validator" "/twitter-follower-count" "/twitter-id" "/twitter-id-to-username" "/twitter-profile-analytics" "/twitter-profile-picture-downloader" "/twitter-search-without-account" "/twitter-thread-reader" "/twitter-video-downloader"}) and (lower(http.request.headers["accept"][0]) eq "text/markdown" or starts_with(lower(http.request.headers["accept"][0]), "text/markdown,")))
```

Set **Path** to **Rewrite to Dynamic**:

```txt
concat(http.request.uri.path, ".md")
```

Leave the query string unchanged.

The allowlist keeps legacy redirects working, including `/docs/api`. When a
new top-level page or blog post is published, add its path to this rule. New
`/docs/*` and `/reports/*` pages are covered automatically.

The `.md` exclusion prevents `/docs/mcp.md` becoming `/docs/mcp.md.md`. The
strict `Accept` check supports a normal Markdown request and a Markdown-first
media list while leaving `Accept: text/markdown;q=0` on the HTML page.

## Generated response metadata

The build creates:

- one `.md` file for every canonical HTML page
- a Markdown alternate link in every HTML document
- `agent-routes.json` with canonical URLs, paths, hashes, byte counts, and
  token estimates
- `llms.txt`
- `/.well-known/agent-skills/index.json`
- `/.well-known/agent-skills/ilo/SKILL.md`
- `_headers` rules for discovery, MIME types, caching, and security headers

Cloudflare applies `_headers` directly to static asset responses. Do not move
these headers or Markdown negotiation into Worker code.

## Check the deployed site

Run these after changing the build or zone rules:

```sh
curl -sS -D - https://ilo.so/docs/mcp -o /dev/null
curl -sS -D - https://ilo.so/docs/mcp \
  -H 'Accept: text/markdown' -o /dev/null
curl -sS -D - https://ilo.so/docs/mcp.md -o /dev/null
curl -sS -D - https://ilo.so/docs/mcp \
  -H 'Accept: text/markdown;q=0' -o /dev/null
curl -sS -I https://ilo.so/docs/api
curl -sS -I https://www.ilo.so/docs/mcp
curl -sS -I http://ilo.so/docs/mcp
```

The normal request should return HTML. The negotiated and explicit Markdown
requests should return the same bytes with `Content-Type: text/markdown`. The
`q=0` request should return HTML. `/docs/api` should permanently redirect to
the home page. Both `www` and plain HTTP should permanently redirect to the
canonical HTTPS URL.

Cloudflare documents the underlying behavior in its [Static Assets
routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/),
[URL Rewrite Rules](https://developers.cloudflare.com/rules/transform/url-rewrite/),
and [Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/)
guides.
