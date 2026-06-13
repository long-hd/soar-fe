# 0001. Tab-key URL pattern + flat routing dispatcher

- Date: 2026-06-13 (retroactive — extracted from Phase 5A scaffold deliberations)
- Status: Accepted
- Tags: routing, frontend
- Related: ADR 0002 (BE-driven menu)

## Context

Soar's BE adopted yudao's data model where `system_menu` rows describe both the sidebar navigation hierarchy AND the routable pages. Each row carries `path`, `component`, `permission`, and (newly added in V1_0_8) `tab_key`.

yudao's Vue3 frontend consumes this by calling `router.addRoute()` at login time, dynamically registering routes from the menu list. The user navigates to `/system/user` (yudao's URL), Vue Router matches the dynamically-registered route, and the corresponding component mounts.

React Router (`react-router-dom` v7) does NOT expose a `router.addRoute()` API. Routes must be declared statically at app-mount time. Direct yudao parity is not possible without writing a custom router or building routes from a snapshot of the menu schema at build time.

This is a foundational decision because every page in the admin lives under it.

## Decision

Use a **flat URL pattern**: `/?tab=<tab_key>`. A single route at app root mounts a `TabRenderer` component that reads the user's menu list from auth state, finds the menu row with matching `tab_key`, and resolves its `component` field (e.g., `"system/user/index"`) to a lazy import via `import.meta.glob('/src/pages/**/*.tsx')`.

`tab_key` is a stable, kebab-case identifier added to the BE schema for exactly this purpose. Unlike `path` (which encodes hierarchy and may change as menus reorganize), `tab_key` is a flat namespace per tenant. Renaming a menu's display path doesn't break URLs.

Schema additions on BE side (V1_0_8):

- `tab_key VARCHAR(100)` added to `system_menu`
- `path` and `component_name` deprecated but kept for yudao import compatibility

## Alternatives considered

**A. Build-time route registration from BE menu snapshot.**
A CI step would query the seed BE menu, generate a TypeScript routes file, and bake it into the bundle. Rejected because: (1) requires a build-time BE round-trip — CI complexity, (2) any menu change requires FE rebuild + redeploy, (3) tenant-specific menus impossible (one tenant's menu would leak into another's bundle).

**B. Custom React Router extension with runtime `addRoute`.**
Patching or wrapping `react-router-dom` to support runtime registration. Rejected because: (1) deep entanglement with library internals, (2) fragile across `react-router-dom` upgrades, (3) loses ecosystem benefits (DevTools, type safety).

**C. Hash-based dispatcher (`#/system/user`).**
A simpler tab dispatcher using URL hash. Rejected because: (1) `?tab=` is more conventional, (2) breadcrumbs and link-sharing more natural with query strings, (3) hash creates issues with anchor links inside pages.

**D. (Chosen) Flat URL `?tab=<tab_key>` + TabRenderer dispatcher.**

## Consequences

### Positive

- React Router stays simple — single root route, no plugins.
- BE menu is single source of truth. Adding a page requires only BE seed update; FE auto-discovers via `import.meta.glob`.
- Per-tenant menus work naturally — TabRenderer reads from auth state which reflects the logged-in user's tenant.
- Tab activation, switching, and Activity keep-alive cleanly composable (see task A0).
- Deep linking works: `/?tab=system-user` reproduces the user's view.

### Negative

- URL doesn't reflect logical hierarchy (`/system/user` would be more discoverable than `/?tab=system-user`). Mitigated: admin app, not consumer-facing — URLs rarely shared outside the app.
- Browser tab title needs explicit setting via `document.title` since route doesn't provide one. Handled in TabRenderer.
- Browser back/forward navigation between tabs requires explicit `history.pushState` calls (router doesn't auto-track tab changes). Handled in TabRenderer.

### Risks

- If `import.meta.glob` ever changes semantics in Vite, dispatcher logic needs migration. Low likelihood; isolated to one file.
- If `tab_key` collisions occur across modules (e.g., two modules both seed `user`), the second wins silently. Mitigation: BE seed convention `<module>-<entity>[-<action>]` (`system-user`, `system-user-detail`).

### Follow-ups

- `parentTabKey` field added in V1_0_8 but not yet consumed by FE — needed for detail pages that should highlight a parent menu (tracked as tech debt #13).

## References

- Task: `tasks/5b/A0-activity-keep-alive.md` (TabRenderer implementation)
- BE schema: `soar-module-system/.../resources/db/migration/V1_0_8__menu_tab_key.sql`
- FE entrypoint: `src/layouts/components/tab-renderer.tsx`
- Plan: `../../plans/fe-admin-architecture-plan.md` (routing section)
