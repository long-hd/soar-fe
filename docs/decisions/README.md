# Decisions

This directory contains two kinds of records:

- **`adr/`** — Architecture Decision Records: single-decision documents in Michael Nygard format
- **`tasks/`** — Block deliverables: work documents that drove individual implementation blocks

## Why both

ADRs answer **why** a decision was made (canonical, concise, ~50–100 lines each).

Task deliverables show **how** work proceeded, including alternatives tried and failed (~200–500 lines each).

Same decision may be referenced from both — ADR for quick lookup, task for full narrative including dead-ends.

## ADR index

ADRs are numbered sequentially and append-only. Once accepted, the file's number doesn't change; instead, a new ADR can supersede an old one (and the old ADR's status changes to "Superseded by #X").

| #                                                    | Title                                            | Status   | Tags          |
| ---------------------------------------------------- | ------------------------------------------------ | -------- | ------------- |
| [0001](adr/0001-tab-key-url-pattern.md)              | Tab-key URL pattern + flat routing dispatcher    | Accepted | routing       |
| [0002](adr/0002-api-unwrap-in-method.md)             | API method unwraps `CommonResult` internally     | Accepted | http          |
| [0003](adr/0003-i18n-single-namespace-file-split.md) | i18n single-namespace + per-domain file split    | Accepted | i18n          |
| [0004](adr/0004-dict-select-string-boundary.md)      | DictSelect string-boundary                       | Accepted | forms, dict   |
| [0005](adr/0005-mutations-no-callback-chain.md)      | Mutations don't accept callbacks — caller chains | Accepted | data-fetching |
| [0006](adr/0006-params-serializer-split.md)          | paramsSerializer split for mixed array shapes    | Accepted | http          |

## Task index

Tasks are grouped by phase. Each block produced a deliverable doc that drove the implementation.

### Phase 5B

#### Foundation infrastructure

These blocks built reusable infrastructure consumed by every CRUD page that follows.

- [A0 — Activity keep-alive + TabRenderer](tasks/5b/A0-activity-keep-alive.md) — React 19.2 `<Activity>` keep-alive for tab state preservation across switches.
- [A1 — Permission infra](tasks/5b/A1-permission-infra.md) — `usePermission`, `<HasPermission>`, `<HasRole>`. Wildcard `*:*:*` semantics.
- [A2 — Dict infra](tasks/5b/A2-dict-infra.md) — `useDictData`, `<DictSelect>`, `<DictTag>`. Eager prefetch on shell mount.
- [A3 — Dept infra](tasks/5b/A3-dept-infra.md) — `useDeptTree`, `<DeptTreeSelect>`. Tree builder util.
- [A4 — Post infra](tasks/5b/A4-post-infra.md) — `usePostList`, `<PostSelect>` (single + multi mode).
- [A5 — Table state hooks](tasks/5b/A5-table-state-hooks.md) — `useTableState<TFilters>` + `usePagedQuery`. Foundation of every CRUD list page.
- [AA — Tech debt tracker](tasks/5b/AA-tech-debt-tracker.md) — `TECH_DEBT.md` schema + AGENTS.md protocol amendment.

#### Tags view (TabBar UX)

- [T1.0 — Tags view patterns](tasks/5b/T1.0-tags-view-patterns.md) — Design decisions for breadcrumb-style tab bar.
- [T1.1 — Tags view slice](tasks/5b/T1.1-tags-view-slice.md) — Redux slice + persistence config (`sessionStorage`).
- [T1.2 — TabBar component](tasks/5b/T1.2-tab-bar.md) — Header tab strip with context menu (Close/Close Others/Close All/Refresh).
- [T1.3 — TabRenderer patch](tasks/5b/T1.3-tab-renderer-patch.md) — Wire tags-view-slice into the dispatcher.

#### Task 2 — system/user CRUD (template page)

The first complete CRUD page, serving as the reference for all subsequent port-loop pages.

- [T2.0 — Patterns and decisions](tasks/5b/T2.0-task2-patterns.md) — Pure decisions doc: scope, file layout, sub-block split, 24 decisions covering form/table/UX.
- [T2.0a — antd `<App>` wrapper](tasks/5b/T2.0a-antd-app-wrapper.md) — Theme-aware message/modal/notification context. Resolved tech debt #11.
- [T2.0b — i18n namespace migration](tasks/5b/T2.0b-i18n-namespaces.md) — Per-domain JSON files + single-namespace runtime merge + type augmentation. Resolved #6.
- [T2.1 — User types + API + constants](tasks/5b/T2.1-user-types-api.md) — TS DTOs, API client (Phase 5A unwrap pattern), permission/dict constants.
- [T2.2 — User list page + search form](tasks/5b/T2.2-user-list-page.md) — Largest block. Heavy composition: useTableState + usePagedQuery + 3 mutations + 7 columns + bulk delete + Switch column. Stubs Create/Edit/Reset for T2.3/T2.4.
- [T2.3 — User form modal](tasks/5b/T2.3-user-form-modal.md) — Unified create/edit modal. Conditional password field. `useUserDetailQuery` on open in edit mode. Dirty-check gate.
- [T2.4 — Reset password modal](tasks/5b/T2.4-reset-password-modal.md) — Two-field modal with match validation via `dependencies={['newPassword']}`.
- [T2.5 — Closing block](tasks/5b/T2.5-task2-closing.md) — Refresh button + hide-search toggle + skill template rewrite + final smoke test + Phase 5B checkpoint.

### Phase 5A

Phase 5A deliverables predate this archive convention and were not reconstructed. See `../phases/phase-5a-summary.md` for the phase retro.

## Reading paths

For future humans or agents learning how this codebase evolved:

- **Understand the routing model** (tab-key URL pattern):
  `../plans/fe-admin-architecture-plan.md` → `tasks/5b/A0-activity-keep-alive.md`

- **Understand the CRUD page pattern** (the template for all admin pages):
  `../../skills/crud-page/README.md` → `tasks/5b/T2.0-task2-patterns.md` → `tasks/5b/T2.1..T2.5-*.md` in order

- **Understand foundation infrastructure** (helpers consumed by features):
  `tasks/5b/A0-activity-keep-alive.md` → `A1` → `A2` → `A3` → `A4` → `A5` → `AA` (in order, each ~independent)

- **Understand tags-view (TabBar) behavior**:
  `tasks/5b/T1.0-tags-view-patterns.md` → `T1.1` → `T1.2` → `T1.3`

- **Understand cross-cutting hotfixes** (subtle lessons codified):
  Tags scattered — paramsSerializer pattern (T2.2 + skill), DictSelect tax (T2.2 + T2.3 + skill), antd `<App>` migration race (T2.0a)

- **Understand the tech debt model**:
  `tasks/5b/AA-tech-debt-tracker.md` → `../../TECH_DEBT.md`

- **Understand routing model**:
  ADR 0001 → `tasks/5b/A0-activity-keep-alive.md` → src `tab-renderer.tsx`

- **Understand the HTTP layer**:
  ADR 0002 → ADR 0006 → src `src/shared/api/http-client.ts`

- **Understand form patterns** (DictSelect tax, mutations chain):
  ADR 0004 → ADR 0005 → `../../skills/crud-page/`

## Adding a new ADR

1. Pick next number (current highest + 1).
2. Create `adr/NNNN-short-kebab-title.md` using the Michael Nygard template:

```markdown
# NNNN. Title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by #X | Deprecated

## Context

What's the situation, what's the problem.

## Decision

The choice made + rationale.

## Consequences

Trade-offs, follow-ups, risks. Both positive and negative.
```

3. Update the ADR index table in this README.
4. Optionally cross-reference from the relevant task deliverable in `tasks/`.

## Adding a task deliverable

When a block ships, copy its deliverable markdown to `tasks/<phase>/<block-id>-<short-title>.md`. Update the Phase section above.

This preserves the work-in-progress reasoning chain, including alternatives considered and discarded — high-value context for future humans or AI assistants tackling similar work.
