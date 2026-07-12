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
- **Security hardening** — authed-by-default `(app)` route group, session-validation
  resilience (a DB blip degrades to logged-out, not a 500), per-IP rate-limiting on
  login/register, and case-insensitive usernames.
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
- **Collection status** — mark catalog items as owned / wishlist / sample / used-up.
  Status is shared (the group sees who owns/wants each item on the detail page),
  settable from the detail page and inline from the catalog grid, filterable via a
  "My collection" facet, with a dedicated `/collection` page grouped by status.
- **Burn log** — dated burn entries on each incense (date, optional notes, optional 0–5 session rating), shared with the group, on the detail page.
- **Tags** — free-form, shared tags on catalog items: add/remove on the detail page,
  filter the catalog by tag, tag chips on grid cards, and a tags field on the add/edit
  form.
- **Test isolation** — each Vitest worker gets its own auto-provisioned,
  auto-migrated database and every test starts from a truncated clean slate, so
  tests are order-independent and the first-user-becomes-admin path is covered.
- **UI polish** — the add/edit incense form is grouped into labelled sections (Identity,
  Character, Details, Sourcing & price, Tags) with proper spacing, and the catalog
  header no longer clips its action buttons on narrow widths.
