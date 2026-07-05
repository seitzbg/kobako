# Kōbako (香箱)

Kōbako is a self-hosted web app for cataloging and reviewing incense — a single
shared catalog with per-user multi-axis reviews, burn logs, and collection
tracking. It's invite-only: there's no public sign-up, so it's meant to be run
for yourself or a small group of friends on your own infrastructure.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for the Postgres database)
- [pnpm](https://pnpm.io/installation)
- [Node.js](https://nodejs.org/) 20 (see `.nvmrc`)

## Quickstart

```sh
cp .env.example .env      # then edit POSTGRES_PASSWORD for anything non-local
docker compose up -d db
pnpm install
pnpm drizzle-kit migrate
pnpm dev
```

The app will be available at the URL printed by `pnpm dev` (typically
`http://localhost:5173`).

## First run

Registration is invite-only and there's no seed data, so the very first invite
has to be created by hand:

```sh
docker compose exec db psql -U kobako -c "insert into invites (token) values ('bootstrap-me');"
```

Then visit `/register` and sign up with that token. The **first user ever
registered** automatically becomes an **admin**, regardless of which invite
was used. Once signed in as admin, visit `/invites` to generate further,
single-use invite codes for anyone else you want to give access to.
