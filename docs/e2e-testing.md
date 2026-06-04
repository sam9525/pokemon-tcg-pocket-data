<!-- docs/e2e-testing.md -->
# End-to-End Testing

Run: `npm run test:e2e`. Requires a local MongoDB at
`mongodb://127.0.0.1:27017` (or set `E2E_MONGO_URL`; the DB name must contain
"test") **pre-loaded with the `Card` + `DeckList` catalog** (see below). The
home page is `force-dynamic` so the **production build** (`next build && next
start`) doesn't prerender-fetch a not-yet-running server. `MONGO_URL` is
overridden to the test DB via `webServer.env`.

## Catalog restore (committed snapshot)
The catalog lives as a committed fixture in `tests/e2e/fixtures/catalog/`,
refreshed deliberately from prod by a maintainer (never from CI):
```bash
# Refresh fixture (maintainer only):
mongodump --uri "<ATLAS_URI>" --db <PROD_DB> --collection Card     --out tests/e2e/fixtures/catalog
mongodump --uri "<ATLAS_URI>" --db <PROD_DB> --collection DeckList --out tests/e2e/fixtures/catalog
# Restore into the test DB (local + CI):
mongorestore --uri "mongodb://127.0.0.1:27017" --nsFrom "<PROD_DB>.Card"     --nsTo "pokemon_e2e_test.Card"     --drop tests/e2e/fixtures/catalog
mongorestore --uri "mongodb://127.0.0.1:27017" --nsFrom "<PROD_DB>.DeckList" --nsTo "pokemon_e2e_test.DeckList" --drop tests/e2e/fixtures/catalog
```
The suite never wipes `Card`/`DeckList`.

## External integrations
Gemini (chatbot), S3 avatar writes (upload), and Google OAuth are **not**
exercised live: chatbot/upload assert deterministic guard paths for real and
mock the external happy path; OAuth asserts redirect initiation only. No real
Gemini calls, no real S3 writes, no real Google login.

## Lifecycle
- `globalSetup` connects to the test DB, wipes **only** `User`/`UserDeck`,
  verifies the restored catalog is present, seeds a user/admin and one deck
  built from real cards, mints JWT cookies whose identities match the seed
  (`tests/e2e/.auth/*.json`), and writes `seed.json` (ids/version for tests).
- `globalTeardown` removes only the seeded users/decks (catalog preserved).
- Serial execution (`workers: 1`) because the suite mutates a shared DB.

## Auth
JWT-strategy cookies are minted with `AUTH_SECRET` (no DB round-trip to decode).
The seeded `User.email` must equal the token email — server routes look users
up by email. Specs opt in with `test.use({ storageState: USER_STATE })`.

## S3
`packages-metadata` and `decks-list` SSR hit the **real** bucket, read-only
(card-catalog metadata only — no writes). Requires AWS creds in `.env.local`.

## Safety
`db.ts` refuses to seed/drop any `MONGO_URL` that does not contain "test".
Never point e2e at the dev/prod database.
