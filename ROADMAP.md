# Kōbako Roadmap

## v1 (in progress)

- [x] Plan 1 — Foundation & auth (invite-only, sessions, roles, app shell)
- [ ] Plan 2 — Shared catalog, per-user multi-axis reviews, burn log, collection status, tags, browse/search, rating comparison
- [ ] Plan 3 — Paste-URL importer (JSON-LD → OG → meta), SSRF guard, image caching, de-dup

## Hardening & follow-ups (from the Plan 1 whole-branch review)

Deferred as acceptable for a v1 self-hosted foundation, tracked here so they stay conscious decisions:

- [x] **Deployment story (done):** `@sveltejs/adapter-node` Node server, multi-stage `Dockerfile`, and a compose `app` service that auto-migrates on startup; cookie `secure` now derives from `!dev`. Runs behind a TLS reverse proxy (`ORIGIN`, configurable `APP_PORT`).
- **Defense-in-depth:** add `(app)/+layout.server.ts` calling `requireUser`, so any future `(app)/*` route is guarded by default (currently `/invites` self-guards only).
- **Bootstrap seed:** a `pnpm seed:invite` command so the first admin doesn't need a manual `psql` insert — also gives the first-user-admin branch something to test against.
- **Test isolation:** per-test transaction or ephemeral schema so tests don't share one mutable DB; add an isolated test that actually exercises the first-user-becomes-admin path; document the git-ignored `.env.test`.
- **Resilience:** wrap `validateSessionToken` in `hooks.server.ts` in try/catch so a transient DB error degrades to logged-out instead of a 500.
- **Abuse controls:** rate-limit `/login` and `/register`; normalize usernames (case-insensitive).
- **Polish:** only re-issue the session cookie when the sliding refresh actually extends expiry (avoid `Set-Cookie` on every request); a `GET /logout` currently 500s (POST-only) — add a redirecting `load` or leave POST-only by design.

## Later

- Per-shop import enhancers
- Bulk / background import
- Barcode scanning
- Stats & charts
- Public sharing
- PWA / mobile polish
- Recommendations
