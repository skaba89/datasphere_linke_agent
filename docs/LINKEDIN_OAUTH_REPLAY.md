# LinkedIn OAuth replay protection — shared database

The LinkedIn OAuth `state` is HMAC signed, user-bound, valid for 10 minutes and consumed once through a PostgreSQL unique constraint. This fixes the previous per-process `Map` replay weakness.

## Deployment order

1. Apply `prisma migrate deploy` successfully **before deploying the new OAuth code**. If the table is missing, the verification fails closed and LinkedIn account connections will stop working; do not skip or background the migration.
2. Deploy the code with `DATABASE_URL` and `JWT_SECRET` (or the legacy auth secret) available. Do not expose these values in logs.
3. The authenticated `/api/cron/check-token-expiration` cleans up expired consumed states. Schedule it regularly and verify results.
4. Verify fresh login + OAuth consent, tampered state refusal, expired state refusal, user mismatch, and the same valid state returned simultaneously to two app instances. Exactly one may be accepted.
5. Check that the migration and cleanup work in the production database; do not treat the unit tests as proof of a successful real OAuth round trip.

## Failure modes

- Database unavailable: callbacks reject the state instead of retrying with a local nonce cache. Restore DB service before reconnecting.
- Duplicate nonce: identical state is rejected after the first successful consumption.
- Records expired after 15 minutes can be pruned; validity still depends on the signed timestamp (10 minutes), not database retention.
- The state check is shared by `GET /api/linkedin/callback` and `POST /api/linkedin/auth`.

## Tests

`npx vitest run tests/unit/linkedin-oauth-state.test.ts`
`node scripts/test-migrations.js`
`npx prisma validate`
`npm run lint`
`npm run build`

Production migration and end-to-end LinkedIn account connection require separate verification.
