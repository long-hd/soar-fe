# Tech Debt Tracker

> Single source of truth for known shortcuts, deferred features, and quality gaps across Soar.
>
> Updated per block. See `AGENTS.md § Tech Debt Protocol` for maintenance rules.

**Last updated**: 2026-06-13 (end of Phase 5B Task 2)

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

_(none — #11 antd App resolved by T2.0a)_

### Medium severity

| ID  | Title                                                  | Opened | Target                | Cross-ref | Notes                                                                                                         |
| --- | ------------------------------------------------------ | ------ | --------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| #9  | Stale tenantId not re-validated on boot                | 5A     | 5C tenant edge cases  | —         | Phase 5C may add "enter tenant name" form.                                                                    |
| #13 | `parentTabKey` BE field + FE consume                   | 5A     | 5B Task 3 (on demand) | —         | Required for detail-page menu highlighting. Deferred per KICKOFF — only when first detail page lands.         |
| #14 | Menu + dict + post labels not i18n (raw BE EN strings) | 5A     | 5C i18n batch         | A2-TD3    | All labels from BE seed currently English-only. Same root cause as A2-TD3 (dict labels).                      |
| #17 | TabRenderer has no ErrorBoundary                       | 5A     | 5C polish             | —         | Lazy load error or component render throw propagates to React default overlay. Production-blocker eventually. |

### Low severity

| ID         | Title                                                                                                     | Opened     | Target                                           | Cross-ref     | Notes                                                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #12        | `theme-slice` semantic stretch (mode + siderCollapsed)                                                    | 5A         | When ui-slice grows                              | —             | Rename to `ui-slice` if more UI state added.                                                                                                                                                                                                   |
| #16        | Iconify online fetch (no offline bundle)                                                                  | 5A         | Production polish                                | —             | Bundle `@iconify/icons-*` for offline / slow networks.                                                                                                                                                                                         |
| #19        | Page placeholder files don't exist                                                                        | 5A         | As CRUD pages land                               | —             | TabRenderer falls back to "coming soon". Resolves naturally as port loop adds pages.                                                                                                                                                           |
| TV-A       | Drag-reorder tabs in TabBar                                                                               | 5B/T1      | 5C                                               | —             | Yudao has via sortablejs.                                                                                                                                                                                                                      |
| TV-B       | TabBar no scroll-into-view on overflow                                                                    | 5B/T1      | 5C if antd default UX poor                       | —             | Relies on antd default overflow nav buttons.                                                                                                                                                                                                   |
| TV-C       | TabBar no closeLeft/closeRight context actions                                                            | 5B/T1      | When requested                                   | —             | Not in KICKOFF DoD.                                                                                                                                                                                                                            |
| TV-D       | Affix tab UI (always-on tabs like Dashboard)                                                              | 5B/T1      | 5C when Dashboard lands                          | —             | State shape has `closable: boolean` reserved.                                                                                                                                                                                                  |
| TV-E       | URL search-string identity not canonicalized                                                              | 5B/T1      | If reported                                      | —             | Same params in different order would create two tab entries. Edge case in practice.                                                                                                                                                            |
| A1-TD1     | No client-side sider menu permission filter                                                               | 5B/A1      | If security audit requires                       | —             | BE filters server-side. Defensive double-filter not implemented.                                                                                                                                                                               |
| A1-TD2     | `<HasPermission>` no `disabled` shorthand                                                                 | 5B/A1      | If pattern repeats in CRUD pages                 | —             | Currently use `fallback={<Button disabled>}` manually.                                                                                                                                                                                         |
| A1-TD3     | No permission code constants enum                                                                         | 5B/A1      | Indefinitely (yudao parity)                      | —             | Inline strings (`"system:user:create"`). T2.x adopted `<ENTITY>_PERMISSIONS` const per-feature — partial mitigation.                                                                                                                           |
| A2-TD1     | No sessionStorage persistence for lookups (dict + dept + post)                                            | 5B/A2      | If F5 latency observed                           | —             | Yudao: `wsCache` sessionStorage → 0 BE calls after F5. Soar: in-memory only → 1 fetch per lookup type per F5. Path to parity: `@tanstack/query-sync-storage-persister` + `persistQueryClient`. **Single migration covers dict + dept + post.** |
| A2-TD2     | Dict values stringly typed                                                                                | 5B/A2      | If specific form needs strict numeric            | ADR 0004      | BE returns string, antd Select preserves. T2 codified "DictSelect tax" boundary conversion (ADR 0004) as canonical pattern — TD2 stays as architectural note rather than fix-target.                                                           |
| A2-TD3     | Dict labels i18n (BE EN seed only)                                                                        | 5B/A2      | 5C i18n batch                                    | #14           | Same root cause as #14 — entire batch resolves together.                                                                                                                                                                                       |
| A2-TD4     | Dict `cssClass` field unused at FE                                                                        | 5B/A2      | When styling need surfaces                       | —             | BE seed includes it; antd Tag preset colors cover current needs.                                                                                                                                                                               |
| A3-TD2     | Tree builder rebuilds all nodes (no stable subtree identity)                                              | 5B/A3      | When tree size / re-render perf becomes issue    | —             | Memoized at hook level so cost incurred only when underlying data changes — acceptable for dozens of dept nodes.                                                                                                                               |
| A5-TD1     | No URL sync for table state                                                                               | 5B/A5      | Phase 5C if share-link UX needed                 | —             | Per Q1=B. State preserved across tab switch via Activity (A0). F5 loses state. URL sync would be ~30 lines extra in useTableState reading/writing searchParams.                                                                                |
| A5-TD2     | antd column `filters` prop unsupported                                                                    | 5B/A5      | If a page genuinely needs column-filter UI       | —             | Soar convention is external search form. `usePagedQuery.onChange` ignores antd's column filter arg. If needed, the bridge handler can be extended to dispatch to `setFilters`.                                                                 |
| A5-TD3     | Multi-sort unsupported                                                                                    | 5B/A5      | If a page needs multi-column sort                | —             | Q A5.1=A. `usePagedQuery` collapses antd's array form to first entry. BE already supports multi via `sortingFields: List<>` — only FE bridge + UX work needed.                                                                                 |
| T2.0a-TD1  | `antdApp` proxy falls back to static API during initial boot                                              | 5B/T2.0a   | —                                                | —             | If an interceptor fires before `AntdAppRefBridge` mounts (e.g., bootstrapAuth 401), one dev warning may appear. Functional, rare. Acceptable.                                                                                                  |
| T2.0b-TD1  | EN-only type source — VI key mirror not enforced                                                          | 5B/T2.0b   | When VI structure intentionally diverges         | —             | `types.d.ts` imports from `en/*.json`. Missing/typo'd VI keys won't fail type-check, just fall back to EN at runtime. Acceptable for current scale.                                                                                            |
| T2.2-TD1   | Bulk-delete selection persists across pagination (UX confusing)                                           | 5B/T2.2    | If user reports confusion                        | —             | When user selects rows on page 1 then navigates to page 2, selection count badge stays but selected rows aren't visible. antd's default behavior; common admin pattern.                                                                        |
| T2.2-TD2   | RangePicker timezone — uses local timezone for startOf/endOf                                              | 5B/T2.2    | If users in different TZ report off-by-one-day   | —             | `dayjs.startOf('day')` uses local TZ. User in UTC+7 picks "today" → start = UTC+7 00:00 → ISO = UTC 17:00 prev day. BE compares as Instant → may miss records depending on storage TZ. Phase 5C: standardize TZ handling across date filters.  |
| T2.3-TD1   | BE biz errors not bound to form field (toast far from input)                                              | 5B/T2.3    | When per-field server-error mapping emerges      | T2.0 risk #5  | BE returns 200+code≠0+msg, error-interceptor toasts. User sees "Username already exists" as toast at top, not under input. Needs interceptor → form bridge convention. Applies to T2.4 reset-password too.                                     |
| T2.3-TD2   | Edit modal doesn't show "data was modified by another" warning                                            | 5B/T2.3    | If concurrent-edit incidents observed            | —             | useQuery fetches fresh on open, but between open and submit another admin could update. No optimistic locking on BE. Common admin app limitation.                                                                                              |
| T2.3-TD3   | Form modal state leak across open cycles (was: Form.useForm persists across destroyOnHidden)              | 2026-06-13 | 5B/TR-pre                                        |
| T2.5-TD1   | Hide-search animation hardcoded 600px max-height cap                                                      | 5B/T2.5    | If a feature page's search form exceeds cap      | —             | CSS max-height transition needs upper bound. 600 = safely > 5-field 1-row form. Refactor: measure scrollHeight via ref + useEffect, or use react-collapse library. Defer until cap actually hit.                                               |
| TR-pending | User role assignment UI not implemented                                                                   | 5B         | After `system/role` page (port loop block #1)    | Q A3 deferral | New mini-block ~120 lines. Calls BE `/admin-api/system/permission/assign-user-role`. New permission `system:permission:assign-user-role`. Button added to user action column.                                                                  |
| TM-TD-1    | Disabled depts not visible in `<DeptTreeSelect>` parent picker                                            | 5B/TD      | If admin needs to assign user to a disabled dept | —             | `useDeptTree` consumes `/simple-list` which BE filters to enabled-only. Same for menu. Acceptable for typical workflows; would need `includeDisabled?: boolean` prop if surfaces.                                                              |
| TM-TD-2    | Expand-all-rows may degrade UX on trees >200 nodes                                                        | 5B/TD,TM   | If dept or menu count grows large                | —             | Currently `defaultExpandAllRows: true` for tree pages. Acceptable for typical orgs. Switch to "expand root + 1 level" or virtualization if grows.                                                                                              |
| TT-TD-1    | `cssClass` field preserved in DictData form but not rendered anywhere FE                                  | 5B/TT      | If yudao re-introduces cssClass usage            | —             | A2-TD4 scope confirmed: kept in form to preserve BE data, no table column. Defer formal decision.                                                                                                                                              |
| TM-TD-3    | `MenuTreeSelect` doesn't filter cascade — buttons can't have children anyway so 1-level filter sufficient | 5B/TM      | If BE allows BUTTON→MENU children in future      | —             | Currently filters `type === BUTTON` recursively but BUTTON has no children by design. Filter logic robust if BE schema changes.                                                                                                                |
| TM-TD-4    | `AppShell` doesn't `prefetchMenuTree` on mount                                                            | 5B/TM      | If parent picker latency noticeable              | —             | Lazy loads on first menu admin edit. Acceptable for infrequent ops. Match dept pattern (`prefetchDeptTree` already wired) if needed.                                                                                                           |

---

## Resolved

Chronological (newest first).

| ID                                    | Title                                                                                                     | Resolved   | By       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| #6                                    | Typed `t()` via module augmentation                                                                       | 2026-06-12 | 5B/T2.0b |
| #11                                   | antd `message`/`Modal` static API → `App.useApp()` context                                                | 2026-06-12 | 5B/T2.0a |
| #5                                    | tagsView UI skeleton → full impl + multi-tab AppShell                                                     | 2026-06-10 | 5B/T1    |
| #1, #2, #3, #4, #7, #8, #10, #15, #18 | Resolved during Phase 5A — see `docs/phases/phase-5a-summary.md` for individual titles + resolution notes | 2026-06    | 5A       |

| ID       | Title                                                     | Resolved by | Notes                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A3-TD3` | `<DeptTreeSelect>` no `disabledIds` for subtree exclusion | 5B/TD block | Added `disabledIds` prop + recursive disable in `toTreeData`. Validates in dept edit modal (excludes self + descendants). Reused by `<MenuTreeSelect>` (TM block) — pattern propagated to foundation. |

---

## Severity Drift Review

Manual review at start of each new Phase. Items open across multiple phases without resolution should be re-evaluated (escalate, close as `wontfix`, or confirm parking).

| Phase         | Date       | Reviewed by           | Outcome                                                                                                                                                                                                                      |
| ------------- | ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5A → 5B       | 2026-06-11 | Initial seeding       | All items classified for the first time. No drift adjustments yet.                                                                                                                                                           |
| 5B/T1 → 5B/T2 | 2026-06-13 | Self (Task 2 closing) | #11 resolved (T2.0a); #6 resolved (T2.0b). A2-TD2 partially mitigated by ADR 0004 (DictSelect tax pattern codified). T2.5-TD1 + TR-pending added. No escalations — all remaining items still acceptable at current severity. |

---

## Stats snapshot (port loop close-out)

**Open count by severity** (post-port-loop):

- High: 0
- Medium: 5 (unchanged from pre-port-loop)
- Low: 32 → +5 new entries from port loop (TM-TD-1 through TM-TD-4, TT-TD-1) = 37 net

**Resolved this iteration**: A3-TD3 (DeptTreeSelect disabledIds)

**Trend**: low-severity backlog growing as patterns mature. Acceptable — each entry has clear trigger condition for re-evaluation. No high-severity items.
