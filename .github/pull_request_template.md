## Summary

<!-- Describe the user-visible change and its scope. -->

## Verification

- [ ] Focused backend tests pass; include commands/results.
- [ ] Focused frontend ESLint passes for changed files.
- [ ] `npm run build` passes from `frontend/` when frontend files changed.
- [ ] Django checks and migration checks pass when backend models/settings changed.
- [ ] Tenant, role, and object-level access tests cover the changed data paths.
- [ ] New/changed environment variables are documented in `docs/DATA_AND_ENV.md`.

## Security and data

- [ ] No real secrets, tokens, credentials, child PII, or sensitive health/payment data are included in code, fixtures, logs, or screenshots.
- [ ] Tenant isolation, role permissions, and object-level access remain enforced server-side.
- [ ] New tables/fields have reviewed migrations and `docs/DATA_AND_ENV.md` is updated.
- [ ] Payment changes do not trust browser return URLs as confirmation; webhook verification/idempotency is covered where applicable.
- [ ] Security implications and any remaining risks are documented in [SECURITY.md](../docs/SECURITY.md).

## Documentation and memory

- [ ] Product/architecture/design docs are updated when behavior or contracts change.
- [ ] A dated decision/status entry is appended to [MEMORY_LOG.md](../docs/MEMORY_LOG.md).
- [ ] Assumptions, deferred work, and known failing baseline checks are called out.
