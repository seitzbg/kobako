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
