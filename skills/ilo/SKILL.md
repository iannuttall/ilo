---
name: ilo
description: Use ilo for local social media drafting, X account setup, scheduling, publishing, and agent workflows. Triggers when a user asks to draft, queue, schedule, publish, or inspect social posts with the ilo CLI or local MCP server.
---

# ilo

ilo is a local-first social publishing CLI and stdio MCP server. Drafts and schedules stay in local SQLite. X OAuth credentials stay in the operating system keychain.

## Safety

- Never publish, run the due scheduler, or pass `--yes` without explicit user confirmation for the exact content or already-reviewed batch.
- Creating, listing, and scheduling drafts do not publish.
- Show the final text and destination before asking for confirmation.
- If the connected account is unclear, check `ilo x status --json` first.
- Do not ask the user to paste OAuth access or refresh tokens. Use `ilo start`.

## Prefer MCP

Use the local MCP tools when available:

- `ilo_status`
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
ilo drafts create --text "Draft text" --json
ilo drafts list --json
ilo drafts schedule <draft-id> --at "tomorrow at 9am" --json
```

After explicit confirmation:

```sh
ilo drafts publish <draft-id> --yes --json
ilo post --text "Approved text" --yes --json
```

Use `ilo scheduler run --json` to inspect the result of a due-post pass. Treat it as a publishing action and confirm first.

## Setup

If no X account is connected:

1. Tell the user to create an X developer app with OAuth 2.0 read and write access.
2. Tell them to register `http://127.0.0.1:8976/callback`.
3. Run `ilo start` interactively.

Do not invent provider charges, limits, or approval status. X controls those.
