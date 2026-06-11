# Tech Debt Tracker

> Single source of truth for known shortcuts, deferred features, and quality gaps across Soar.
>
> Updated per block. See `AGENTS.md § Tech Debt Protocol` for maintenance rules.

**Last updated**: 2026-06-11 (after AA — initial seeding)

---

## Schema

| Field         | Values                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**        | `#<N>` for Phase 5A heritage (immutable for cross-reference). `<Block>-TD<N>` for new items (e.g., `A2-TD1`).                                                                   |
| **Severity**  | `critical` (blocks current work) / `high` (will hit during current/next phase) / `medium` (visible quality gap, fix when convenient) / `low` (defer-by-design or "if observed") |
| **Status**    | `open` / `in-progress` / `resolved` / `wontfix`                                                                                                                                 |
| **Opened**    | Phase + block, e.g. `5A` or `5B/A2`                                                                                                                                             |
| **Target**    | Phase/condition for resolution. Empty = no target ("if observed").                                                                                                              |
| **Cross-ref** | Equivalent or dependent items                                                                                                                                                   |

---

## Open

### High severity

| ID  | Title                                                      | Opened | Target    | Cross-ref | Notes                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------- | ------ | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #11 | antd `message`/`Modal` static API → `App.useApp()` context | 5A     | 5B/Task 2 | —         | Static API works but lacks ConfigProvider theming context. Phase 5B Task 2 will use `Modal.confirm` (delete) + `message.success` (action feedback) heavily. **Likely upgrade to critical if theme breaks visibly during Task 2.** Fix: wrap consumers in `App.useApp()` hook. |

### Medium severity

| ID     | Title                                                     | Opened | Target                           | Cross-ref | Notes                                                                                                         |
| ------ | --------------------------------------------------------- | ------ | -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| #9     | Stale tenantId not re-validated on boot                   | 5A     | 5C tenant edge cases             | —         | Phase 5C may add "enter tenant name" form.                                                                    |
| #13    | `parentTabKey` BE field + FE consume                      | 5A     | 5B Task 3 (on demand)            | —         | Required for detail-page menu highlighting. Deferred per KICKOFF — only when first detail page lands.         |
| #14    | Menu + dict + post labels not i18n (raw BE EN strings)    | 5A     | 5C i18n batch                    | A2-TD3    | All labels from BE seed currently English-only. Same root cause as A2-TD3 (dict labels).                      |
| #17    | TabRenderer has no ErrorBoundary                          | 5A     | 5C polish                        | —         | Lazy load error or component render throw propagates to React default overlay. Production-blocker eventually. |
| A3-TD3 | `<DeptTreeSelect>` no `disabledIds` for subtree exclusion | 5B/A3  | Port loop — dept admin edit page | —         | When editing a dept, must prevent setting its own descendant as parent. Add when dept admin edit page lands.  |

### Low severity

| ID     | Title                                                          | Opened | Target                                        | Cross-ref | Notes                                                                                                                                                                                                                                          |
| ------ | -------------------------------------------------------------- | ------ | --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #6     | Typed `t()` via module augmentation                            | 5A     | 5C i18n polish                                | —         | Currently no type safety on i18n keys.                                                                                                                                                                                                         |
| #12    | `theme-slice` semantic stretch (mode + siderCollapsed)         | 5A     | When ui-slice grows                           | —         | Rename to `ui-slice` if more UI state added.                                                                                                                                                                                                   |
| #16    | Iconify online fetch (no offline bundle)                       | 5A     | Production polish                             | —         | Bundle `@iconify/icons-*` for offline / slow networks.                                                                                                                                                                                         |
| #19    | Page placeholder files don't exist                             | 5A     | As CRUD pages land                            | —         | TabRenderer falls back to "coming soon". Resolves naturally as port loop adds pages.                                                                                                                                                           |
| TV-A   | Drag-reorder tabs in TabBar                                    | 5B/T1  | 5C                                            | —         | Yudao has via sortablejs.                                                                                                                                                                                                                      |
| TV-B   | TabBar no scroll-into-view on overflow                         | 5B/T1  | 5C if antd default UX poor                    | —         | Relies on antd default overflow nav buttons.                                                                                                                                                                                                   |
| TV-C   | TabBar no closeLeft/closeRight context actions                 | 5B/T1  | When requested                                | —         | Not in KICKOFF DoD.                                                                                                                                                                                                                            |
| TV-D   | Affix tab UI (always-on tabs like Dashboard)                   | 5B/T1  | 5C when Dashboard lands                       | —         | State shape has `closable: boolean` reserved.                                                                                                                                                                                                  |
| TV-E   | URL search-string identity not canonicalized                   | 5B/T1  | If reported                                   | —         | Same params in different order would create two tab entries. Edge case in practice.                                                                                                                                                            |
| A1-TD1 | No client-side sider menu permission filter                    | 5B/A1  | If security audit requires                    | —         | BE filters server-side. Defensive double-filter not implemented.                                                                                                                                                                               |
| A1-TD2 | `<HasPermission>` no `disabled` shorthand                      | 5B/A1  | If pattern repeats in CRUD pages              | —         | Currently use `fallback={<Button disabled>}` manually.                                                                                                                                                                                         |
| A1-TD3 | No permission code constants enum                              | 5B/A1  | Indefinitely (yudao parity)                   | —         | Codes inline as strings (`"system:user:create"`).                                                                                                                                                                                              |
| A2-TD1 | No sessionStorage persistence for lookups (dict + dept + post) | 5B/A2  | If F5 latency observed                        | —         | Yudao: `wsCache` sessionStorage → 0 BE calls after F5. Soar: in-memory only → 1 fetch per lookup type per F5. Path to parity: `@tanstack/query-sync-storage-persister` + `persistQueryClient`. **Single migration covers dict + dept + post.** |
| A2-TD2 | Dict values stringly typed                                     | 5B/A2  | If specific form needs strict numeric         | —         | BE returns string, antd Select preserves, Spring Jackson coerces back. Client numeric ops require explicit `Number()`.                                                                                                                         |
| A2-TD3 | Dict labels i18n (BE EN seed only)                             | 5B/A2  | 5C i18n batch                                 | #14       | Same root cause as #14 — entire batch resolves together.                                                                                                                                                                                       |
| A2-TD4 | Dict `cssClass` field unused at FE                             | 5B/A2  | When styling need surfaces                    | —         | BE seed includes it; antd Tag preset colors cover current needs.                                                                                                                                                                               |
| A3-TD2 | Tree builder rebuilds all nodes (no stable subtree identity)   | 5B/A3  | When tree size / re-render perf becomes issue | —         | Memoized at hook level so cost is incurred only when underlying data changes — acceptable for dozens of dept nodes.                                                                                                                            |

---

## Resolved

Chronological (newest first).

| ID                                    | Title                                                                                         | Resolved   | By    |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- | ----- |
| #5                                    | tagsView UI skeleton → full impl + multi-tab AppShell                                         | 2026-06-10 | 5B/T1 |
| #1, #2, #3, #4, #7, #8, #10, #15, #18 | Resolved during Phase 5A — see `PHASE_5A_SUMMARY.md` for individual titles + resolution notes | 2026-06    | 5A    |

---

## Severity Drift Review

Manual review at start of each new Phase. Items open across multiple phases without resolution should be re-evaluated (escalate, close as `wontfix`, or confirm parking).

| Phase   | Date       | Reviewed by     | Outcome                                                            |
| ------- | ---------- | --------------- | ------------------------------------------------------------------ |
| 5A → 5B | 2026-06-11 | Initial seeding | All items classified for the first time. No drift adjustments yet. |

---

## Stats snapshot

**As of 2026-06-11 (end of AA)**:

- Open: **23** (1 high, 5 medium, 17 low)
- Resolved: **10** (9 from 5A heritage + 1 from 5B/T1)
- Wontfix: 0

**Distribution by phase opened**:

- 5A (heritage): 9 open + 9 resolved
- 5B/T1 (tagsView): 5 open
- 5B/A1 (permission): 3 open
- 5B/A2 (dict): 4 open
- 5B/A3 (dept): 1 open + 1 dup-skipped (A3-TD1 == A2-TD1)
- 5B/AA (this block): 0
