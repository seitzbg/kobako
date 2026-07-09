# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project adheres to SemVer.

## [Unreleased]

### Added

- Invite-only authentication with DB-backed sessions and member/admin roles.
- SvelteKit + Postgres foundation, docker-compose deployment.
- Admin invite management page.
- Containerized app: `@sveltejs/adapter-node` Node server, multi-stage `Dockerfile`,
  and a compose `app` service that auto-applies DB migrations on startup. Runs
  behind a TLS reverse proxy (`ORIGIN` env; configurable `APP_PORT`).
- **Warm Washi design system** — a themed UI (warm washi-paper light theme and a
  "smoke" dark theme with a toggle) replacing the unstyled default look, with
  reusable card / form / badge / alert / empty-state components.
- **Shared incense catalog** — add, browse (home grid), view, and edit incense
  items with format and scent-family classification.
- **Per-user reviews** — multi-axis scores (scent, throw/smoke, longevity, value,
  overall) plus free-text notes; one review per person per item, editable in place.
- **Ratings comparison** — the item detail page compares everyone's ratings, with
  average overall score and review counts shown on the catalog grid.
- **Paste-a-URL importer** — fetch a shop product page (SSRF-guarded: http/https
  only, private/loopback/link-local IPs rejected on every redirect hop, with
  timeout and size caps) and extract name / brand / price / description / image
  via Shopify JSON → schema.org JSON-LD → Open Graph → `<meta>`, then confirm on a
  prefilled form. Product images are cached locally and served by Kōbako
  (`/media`); the catalog de-dupes by source URL and by name.
- **Catalog browse / search / filter** — the catalog page now supports full-text
  search across name, brand, origin, ingredients and description; multi-select
  filtering by format and scent family; and sorting by newest, name, top-rated,
  or most-reviewed. Filters live in the URL (shareable, bookmarkable) and work
  without JavaScript.
