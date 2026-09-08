# Bingosync

A rebuild of [bingosync](https://github.com/kbuzsaki/bingosync) on Nuxt 4, Nuxt UI, Nitro WebSockets and SQLite.
Shared bingo boards for speedrun races: create a room, share the invite link, mark squares together in real time.

## What is different from the original

- One process. Nitro serves the pages, the JSON API and the WebSocket hub; no Django/Tornado split.
- No room passwords. The invite link (`/join/<code>`) is the key. Codes are 256-bit and can be rotated from inside the room.
- Room ids never appear in a player's URL. You play at `/play/<playerId>`, which only works with your own cookie, so a leaked stream frame reveals nothing.
- Rooms can be unlisted (invite link only) or listed on the home page and in the history.
- OBS overlay at `/overlay/<playerId>?key=<key>`: transparent board plus score row, read-only. Copy the link from the room's Invite popover.
- Optional Twitch sign-in (prefills your nickname, and rooms can be limited to Twitch users).
- Switching your color moves the squares you marked to the new color.
- The 460+ community generators run unchanged inside a `vm` sandbox with a timeout. A golden test compares every game and four seeds against upstream output.

## Development

```sh
vp install
cp .env.example .env   # set NUXT_ADMIN_PASSWORD and NUXT_SESSION_PASSWORD
vp dev                 # http://localhost:4979
vp test                # generator golden tests + unit tests
```

The SQLite database is created at `.data/bingosync.db` and migrated on startup.
Regenerate the game registry after pulling new generators upstream with `python3 scripts/sync-games.py path/to/game_type.py`,
then copy the generator files into `generators/`.

## Configuration

| Variable | Purpose |
|---|---|
| `NUXT_SESSION_PASSWORD` | 32+ char secret for the sealed session cookie |
| `NUXT_ADMIN_PASSWORD` | password for `/admin` |
| `NUXT_DATABASE_PATH` | SQLite file (default `.data/bingosync.db`) |
| `NUXT_OAUTH_TWITCH_CLIENT_ID` / `NUXT_OAUTH_TWITCH_CLIENT_SECRET` | enables Twitch sign-in; redirect URL is `https://<host>/auth/twitch` |
| `NUXT_GENERATOR_TIMEOUT_MS` | per-card generation budget (default 10000) |

## Deploying

The `Dockerfile` builds the app and expects a volume at `/data` for the database. Put Cloudflare in front for TLS and DDoS protection; WebSockets pass through on `/ws`.
