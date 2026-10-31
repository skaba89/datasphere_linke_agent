# Security deployment notes

This PR is **not production-ready without review**.

- Set `DATASPHERE_AUTH_SECRET` to a stable random secret of at least 32 characters. The insecure fallback was removed; all legacy cookies will require a fresh login.
- Set `LINKEDIN_TOKEN_ENCRYPTION_KEY` to a stable 32-byte random value encoded as base64, e.g. `openssl rand -base64 32`. Back up the key in an approved secret manager. Do not rotate without a managed re-encryption plan.
- Existing plaintext LinkedIn tokens are intentionally **not** decrypted. A controlled migration or user reauthorization is required. Never deploy this change without an account-by-account migration/reconnect plan.
- Audit remaining integrations, scheduled workers and background routes for raw `LinkedInAccount.accessToken` and `refreshToken` reads or writes, and update them to use the crypto helper.
- Validate OAuth via both callback and POST exchange paths; check state ownership, expiration, tampering, missing cookie and replay behavior.
- For stronger replay protection, persist a one-use OAuth nonce in a shared store. The signed state currently authenticates and expires, but does not independently prevent replay of the state itself.
- Keep the PR unmerged until `tsc`, lint, Playwright, migration rehearsal and staging LinkedIn end-to-end flows pass.
