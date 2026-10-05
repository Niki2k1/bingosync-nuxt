# Bingosync

A rebuild of [bingosync](https://github.com/kbuzsaki/bingosync) on Nuxt 4, Nuxt UI and Postgres, hosted on
[wervt](https://github.com/wervt-app/wervt) with live data through Electric.
Shared bingo boards for speedrun races: create a room, share the invite link, mark squares together in real time.

## What is different from the original

- One app. Nitro serves the pages and the JSON API; boards, players and the feed are live Electric
  shapes (`server/api/rooms/[id]/shapes`), so there is no socket server and no Django/Tornado split.
- Presence by heartbeat: an open room page pings every 15 s, players without one for 40 s are marked
  as gone (swept lazily on the next request, wervt has no background jobs).
- No room passwords. The invite link (`/join/<code>`) is the key. Codes are 256-bit and can be rotated from inside the room.
- Room ids never appear in a player's URL. You play at `/play/<playerId>`, which only works with your own cookie, so a leaked stream frame reveals nothing.
- Rooms can be unlisted (invite link only) or listed on the home page and in the history.
- OBS overlay at `/overlay/<playerId>?key=<key>`: transparent board plus score row, read-only. Copy the link from the room's Invite popover.
- Optional sign-in through wervt (GitHub, Discord, Twitch, passkeys): prefills your nickname, and rooms
  can be limited to people with a Twitch account linked. Admins are wervt users listed in `NUXT_ADMIN_EMAILS`.
- Switching your color moves the squares you marked to the new color.
- The 460+ community generators run unchanged in a small sandbox (`with` + proxy globals, private `Math`),
  bundled as Nitro server assets. A golden test compares every game and four seeds against upstream output.

## Development

Needs the local wervt stack (`docker compose up -d` in the wervt repo); `@wervt/nuxt` provisions and
migrates the app's database on `nuxt dev`.

```sh
pnpm install
pnpm dev               # http://localhost:4979, /_wervt/login signs you in as the dev user
pnpm test              # generator golden tests + unit tests
pnpm db:generate       # after changing server/db/schema.ts
```

Regenerate the game registry after pulling new generators upstream with `python3 scripts/sync-games.py path/to/game_type.py`,
then copy the generator files into `generators/`.

## Deploying

```sh
pnpm build && wervt deploy
wervt access bingosync --public
wervt env bingosync --set NUXT_ADMIN_EMAILS=you@example.com
```

`@wervt/nuxt` is linked from `../wervt/packages/nuxt` until it is published; after changing it, run
`pnpm update @wervt/nuxt` (pnpm copies `file:` dependencies).
