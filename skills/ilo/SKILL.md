---
name: ilo
description: Use ilo for local X article monitoring, reply inboxes, search monitors, follower research, drafting, account setup, scheduling, publishing, and agent workflows. Triggers when a user asks to monitor or search X articles, monitor X searches, find posts worth replying to, filter authors by relationship or verification, search followers, draft, reply, attach images, queue, schedule, publish, or inspect social posts with the ilo CLI or local MCP server.
---

# ilo

ilo is a local-first social publishing CLI and stdio MCP server. Drafts and schedules stay in local SQLite. X OAuth credentials stay in the operating system keychain.

## Safety

- Never publish, run the due scheduler, or pass `--yes` without explicit user confirmation for the exact content or already-reviewed batch.
- Creating, listing, and scheduling drafts do not publish.
- Show the final text, top-level or reply destination, image paths, and alt text before asking for confirmation.
- If the connected account is unclear, check `ilo x status --json` first.
- Do not ask the user to paste OAuth access or refresh tokens. Use `ilo start`.

## Prefer MCP

Use the local MCP tools when available:

- `ilo_status`
- `ilo_sync_x_followers`
- `ilo_x_follower_sync_status`
- `ilo_search_x_followers`
- `ilo_get_x_follower_profile`
- `ilo_create_x_article_monitor`
- `ilo_list_x_article_monitors`
- `ilo_set_x_article_monitor_enabled`
- `ilo_delete_x_article_monitor`
- `ilo_refresh_x_articles`
- `ilo_search_x_articles`
- `ilo_get_x_article`
- `ilo_create_x_monitor`
- `ilo_list_x_monitors`
- `ilo_set_x_monitor_enabled`
- `ilo_delete_x_monitor`
- `ilo_refresh_x_inbox`
- `ilo_list_x_inbox`
- `ilo_get_x_inbox_item`
- `ilo_update_x_inbox_item`
- `ilo_sync_x_following`
- `ilo_x_following_sync_status`
- `ilo_create_draft`
- `ilo_list_drafts`
- `ilo_schedule_draft`
- `ilo_publish_draft`
- `ilo_publish_post`
- `ilo_run_scheduler`

Publishing tools require `confirm: true`.

## CLI fallback

```sh
ilo x status --json
ilo x followers sync <handle> --pages 20 --json
ilo x followers sync <handle> --background --json
ilo x followers status <handle> --json
ilo x followers profile <handle> <follower-handle> --json
ilo x followers search <handle> --query "works at cursor|vercel|sentry" --json
ilo x followers search <handle> --query "works at cursor|vercel|sentry" --csv ./matches.csv
ilo x articles add <handle> --json
ilo x articles refresh <handle> --json
ilo x articles search --query "browser tools" --json
ilo x articles show <post-id-or-url> --json
ilo x monitors add "product mentions" --query '"product" OR "product.com" -is:retweet' --json
ilo x monitors list --json
ilo x inbox refresh --json
ilo x inbox list --unread --verified --json
ilo x following sync --all --json
ilo x inbox list --follows-me --json
ilo x inbox list --i-follow --json
ilo x inbox show <post-id-or-url> --json
ilo x inbox draft <post-id-or-url> --text "Reply text" --json
ilo drafts create --text "Draft text" --json
ilo drafts create --reply-to <post-id-or-url> --text "Reply text" --image ./chart.png --alt "Chart description" --json
ilo drafts list --json
ilo drafts schedule <draft-id> --at "tomorrow at 9am" --json
```

After explicit confirmation:

```sh
ilo drafts publish <draft-id> --yes --json
ilo post --text "Approved text" --yes --json
ilo post --reply-to <post-id-or-url> --text "Approved reply" --yes --json
```

Use `ilo scheduler run --json` to inspect the result of a due-post pass. Treat it as a publishing action and confirm first.

## Follower research

Follower imports use public FxTwitter data and resume from the last saved page. A full import can take many calls for a large account. Check the returned coverage before reporting a count.

Use the CLI `--background` mode for an unattended full import. Use `ilo_get_x_follower_profile` or the CLI `profile` command when the task needs all stored public fields for one match. The raw provider object may contain fields beyond ilo's structured columns; treat it as public source data, not verified identity or employment evidence.

Search uses the local SQLite FTS5 index. For employer questions, report `current` as the conservative count and keep `former` and `unclear` separate. Include the returned public bio evidence. Do not present a partial import or an ambiguous bio as a complete employment record.

Follower research does not require a connected X account. Publishing does.

## Article monitoring

Article monitors save selected X handles. Refresh them on demand with `ilo_refresh_x_articles` or `ilo x articles refresh`. A refresh saves new articles and resumes older history from the local cursor. It does not run in the background or publish anything.

Use `ilo_search_x_articles` or the CLI `search` command to search saved titles, previews, and full article text with SQLite FTS5. Search results return a compact excerpt. Use `ilo_get_x_article` or `ilo x articles show` to inspect the complete stored body and raw provider record before quoting or summarizing it.

State the evidence limit when article history is incomplete. A monitor with `historyComplete: false` has more older pages available. Refresh it again before describing the local results as the complete article history for that handle.

## Reply inbox

Monitors are saved X advanced-search queries. Refresh them on demand with `ilo_refresh_x_inbox` or `ilo x inbox refresh`; ilo does not run an always-on monitor process yet. A refresh saves public post, author, engagement, monitor, and raw provider evidence locally. It does not publish.

Use inbox filters to narrow results before proposing replies. `verified` is observed on the stored public author profile. `followsMe` and `iFollow` are tri-state: `true` is a known imported relationship, `false` is only reliable after the relevant full follower or following import, and `null` means unknown. Never turn `null` into false.

Use the account's follower import for `followsMe` and its following import for `iFollow`. A partial import can prove a relationship it contains, but it cannot prove an absent relationship.

Inspect the complete inbox item before drafting. Creating a reply draft and changing read, archive, or replied state are local actions and do not need publishing confirmation. Still show the exact reply target, text, images, and alt text before asking to publish the draft.

## Replies and images

Pass `replyToPostId` to create or publish a reply. It accepts a numeric X post id or an X post URL. X can still reject a target under its API access or conversation rules.

Posts and drafts accept up to four local JPEG, PNG, or WebP files. Use alt text when it adds useful context. A scheduled draft stores the image paths, so those files must remain available until it publishes.

## Setup

If no X account is connected:

1. Tell the user to create an X developer app with OAuth 2.0 read and write access.
2. Recommend the Native App type so PKCE works without a client secret.
3. Tell them to register `http://127.0.0.1:8976/callback` exactly.
4. Run `ilo start` interactively. It repeats these details before asking for the Client ID.

Do not invent provider charges, limits, or approval status. X controls those.
