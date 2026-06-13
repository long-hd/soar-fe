# Skill: Create CRUD Page

Build a complete CRUD admin page (list + search + create/edit modal + delete + optional status/password actions) for a flat entity that has BE controller endpoints and menu seed.

This skill is **agent-consumable** — an AI assistant reading the files in this folder can produce a working CRUD page with minimal human intervention.

## When to use

Apply this skill when ALL of the following hold:

- BE has a controller with standard endpoints. At minimum: `/page`, `/get`, `/create`, `/update`, `/delete`.
- Optional endpoints recognized by this skill: `/delete-list`, `/update-status`, `/update-password`. Skip the corresponding UI if BE doesn't provide them.
- A `system_menu` row exists with `tab_key` populated AND `component` pointing to a path under `src/pages/` (e.g., `system/role/index`).
- The entity is **flat** (no parent-child tree). For tree entities (dept, menu), this skill applies partially — see "Variants" section below.

If the entity has BE controller endpoints that **don't** match the standard shape (e.g., custom workflow endpoints like `/approve`, `/assign`), this skill covers only the standard CRUD part; the custom workflow needs ad-hoc design.

## Prerequisites

This skill assumes Phase 5B foundation is in place. Verify before starting:

| Helper                                | Source                  | Used for                     |
| ------------------------------------- | ----------------------- | ---------------------------- |
| `usePagedQuery`, `useTableState`      | `@/shared/hooks/use-*`  | List table                   |
| `<DictSelect>`, `<DictTag>`           | `@/shared/components/`  | Dict-typed inputs            |
| `<DeptTreeSelect>`                    | `@/shared/components/`  | Dept FK fields               |
| `<PostSelect>`                        | `@/shared/components/`  | Post FK fields               |
| `<HasPermission>`, `usePermission`    | `@/features/permission` | Permission gating            |
| antd `<App>` wrapped at provider tree | `src/app/providers.tsx` | `App.useApp()` works         |
| i18n namespace pattern                | `src/shared/i18n/`      | Per-domain JSON files merged |

If any is missing, build it as a foundation block first. Don't inline a one-off duplicate inside this feature.

## Workflow (agent execution path)

Read docs **in this order** to build a CRUD page:

```
1. be-extraction.md   →  Extract inputs from BE controller
2. decisions.md       →  Apply heuristics to pick variants
3. steps.md           →  Execute 9-step build with templates
4. _example/          →  Reference implementation for unclear cases
```

Each doc has a specific role:

| Doc                | Answers                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `be-extraction.md` | "What types, endpoints, validations, permissions does this entity have?" |
| `decisions.md`     | "Given the entity shape, which features should the page include?"        |
| `steps.md`         | "How exactly do I write each file?"                                      |
| `_example/`        | "What does the finished result look like?"                               |

After all 4 are consulted, an agent (or human) produces a working CRUD page.

## Agent prompt template

For tools like Cursor or Antigravity, use this prompt as a starting point:

```
You are building a CRUD admin page for the Soar frontend (React 19 + Vite +
antd v6 + TanStack Query + Redux Toolkit).

Entity:            <ENTITY_NAME>          (e.g., "Role", "Post")
Module:            <MODULE_NAME>           (e.g., "system", "infra")
BE controller:     <FILE_PATH>             (e.g., "soar-module-system/.../RoleController.java")
Menu tab_key:      <TAB_KEY>               (e.g., "system-role" — verify exists in system_menu)

Read these files in order BEFORE writing any code:
1. skills/crud-page/README.md         (this file — for context)
2. skills/crud-page/be-extraction.md  (extract inputs from BE)
3. skills/crud-page/decisions.md      (decide which features to include)
4. skills/crud-page/steps.md          (9-step build guide)
5. skills/crud-page/_example/         (reference implementation — system/user)

Also reference when needed:
- CONVENTIONS.md (root) for naming, import, and style conventions
- docs/decisions/adr/ for architectural decisions

Then:
1. Read the BE controller file + its referenced DTOs.
2. Follow be-extraction.md to produce the inputs table.
3. Follow decisions.md to determine feature set.
4. Follow steps.md to write all FE files.
5. Run `pnpm type-check` and `pnpm lint` — fix any errors.
6. Print a summary:
   - Files created (paths)
   - Features included vs skipped (with reasons)
   - Any decisions where you guessed and want human review
   - Open questions blocking smoke test

Do NOT smoke-test yourself (you don't have a running BE). Hand off to human.

If you're unsure about any pattern, MATCH the pattern in _example/ rather than
inventing a new one. If _example/ doesn't cover a case, ask the human.
```

Iterate this template based on observed agent failure modes.

## File index

| File                         | Purpose                              | When to read           |
| ---------------------------- | ------------------------------------ | ---------------------- |
| `README.md` (this file)      | Entry point, workflow overview       | Always first           |
| `be-extraction.md`           | BE controller → FE inputs map        | Step 1 of build        |
| `decisions.md`               | Decision tree for feature variants   | Step 2, before writing |
| `steps.md`                   | 9-step build with file templates     | Step 3, while writing  |
| `_example/README.md`         | Tour of the reference implementation | Reference during build |
| `_example/*.ts(x)`, `*.json` | Sanitized system/user files          | Reference for patterns |

## Variants

The base skill covers flat entities. Common variants and their differences:

### Tree-structured entities (dept, menu)

Significant changes from base skill:

- No paginated table — use `<Tree>` or recursive table
- No bulk delete — typically tree nodes deleted individually
- Form has "parent" picker (TreeSelect of same tree)
- Sort handled by `displayOrder` field, not column click
- See `_example/` for flat reference; tree variant gets its own skill folder when first tree page lands

### Linked entities (dict-type + dict-data)

The dict admin has 2 pages working together:

- Type list (parent) — standard CRUD
- Data list (child) — filtered by selected type

Both follow base skill independently. Linkage handled by:

- Type list passes selected `dictType` via URL or context
- Data list reads `dictType`, filters list query by it
- No new foundation needed

### Pages with relationship assignment (user-role)

Base CRUD page plus a separate modal for managing many-to-many relationships:

- Entity save form does NOT include relationship fields
- Action column has additional "Assign <relation>" button
- Modal: fetch current relations + fetch all options + Transfer/Checkbox UI + submit via dedicated endpoint
- This is a separate mini-skill that composes onto base CRUD

## Relationship to other docs

This skill **operationalizes** these ADRs:

- [ADR 0001](../../docs/decisions/adr/0001-tab-key-url-pattern.md) — Routing dispatcher
- [ADR 0002](../../docs/decisions/adr/0002-api-unwrap-in-method.md) — API unwrap pattern
- [ADR 0003](../../docs/decisions/adr/0003-i18n-single-namespace-file-split.md) — i18n architecture
- [ADR 0004](../../docs/decisions/adr/0004-dict-select-string-boundary.md) — DictSelect tax
- [ADR 0005](../../docs/decisions/adr/0005-mutations-no-callback-chain.md) — Mutations chain
- [ADR 0006](../../docs/decisions/adr/0006-params-serializer-split.md) — Implicit (HTTP layer)

It **complements**:

- `CONVENTIONS.md` (root) — cross-cutting code style (naming, imports). This skill follows those rules without restating them.
- `docs/decisions/tasks/5b/T2.0..T2.5-*.md` — original deliberation that produced this skill. Read those for the "why we landed here" narrative.

It **does NOT cover**:

- Dashboard / chart pages
- File upload features
- Multi-step wizard forms
- Custom workflow pages (approval, assignment beyond user-role)

These need their own skills when they emerge.

## Maintenance

This skill must describe **current** practice. When patterns change:

- A new shared helper lands → mention in the relevant step in `steps.md`
- A decision is revisited → write a new ADR, mark old as "Superseded by #N", update cross-references here
- A common agent failure mode is observed → add to `decisions.md` heuristic table

The `_example/` folder is intentionally a **copy** of `features/system/user/` at a moment in time, not a symlink. If `system/user` is heavily refactored later, decide:

1. Update `_example/` to reflect new pattern (if pattern still canonical), OR
2. Pick a new reference page (e.g., `system/role` once stable) and rebuild `_example/` from it

Don't let `_example/` go stale silently — agents trust it.

## Status

- **Version**: 1 (initial, post Task 2 completion)
- **Last reviewed**: 2026-06-13
- **Validated against**: `features/system/user/` (Task 2 deliverable)
- **Next review**: After port loop block #2 (verifying skill generalizes beyond user)
