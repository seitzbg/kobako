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
