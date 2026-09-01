# Module migration checklist

Copy this checklist into the working issue/PR description when migrating a module.

## 1. Inventory

- [ ] List PHP entry points and AJAX/API endpoints.
- [ ] List database tables/views and important joins.
- [ ] Record session fields used.
- [ ] Record permission flags/module indexes used.
- [ ] Record uploads/filesystem dependencies.
- [ ] Record email, FTP, external APIs and scheduled jobs.
- [ ] Record status codes and implicit business rules.
- [ ] Identify operations shared with another target module.

## 2. Contract

- [ ] Define route names independently from PHP filenames.
- [ ] Define request validation.
- [ ] Define response shape.
- [ ] Add shared API types to `packages/contracts` only when both API and Web need them.
- [ ] Keep Prisma-generated types out of HTTP responses.

## 3. API read path

- [ ] Add application use case.
- [ ] Add repository port when persistence is non-trivial.
- [ ] Add Prisma infrastructure adapter.
- [ ] Add controller/DTO mapping.
- [ ] Implement authorization.
- [ ] Verify pagination/filter semantics against legacy behavior.
- [ ] Add tests for rules that can regress.

## 4. API write/workflow path

- [ ] Document transaction boundaries.
- [ ] Preserve required audit/history behavior.
- [ ] Implement authorization per action.
- [ ] Handle idempotency where duplicate requests are dangerous.
- [ ] Validate side effects such as email/files/events.

## 5. Web

- [ ] Create `apps/web/src/modules/<feature>`.
- [ ] Keep route files in `app/` thin.
- [ ] Add feature API service using `shared/api/api-client`.
- [ ] Use contracts instead of Prisma/database types.
- [ ] Implement loading, empty and error states.

## 6. Parity

- [ ] Compare representative legacy and new results.
- [ ] Compare permissions by user profile.
- [ ] Compare status transitions.
- [ ] Compare totals/pagination/date handling.
- [ ] Verify production-like data without modifying production during validation.

## 7. Cutover

- [ ] Decide routing/navigation cutover.
- [ ] Keep rollback path documented.
- [ ] Monitor logs/errors after cutover.
- [ ] Mark phase in `docs/MIGRATION-MAP.md`.
- [ ] Remove PHP code only after the new path is proven and rollback is no longer needed.
