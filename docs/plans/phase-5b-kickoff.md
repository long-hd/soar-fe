# Phase 5B — Kickoff Plan

**Mission**: Phase 5A built foundation (auth + shell). Phase 5B = first real feature phase. By end of 5B, Soar manages full `system` module (users, roles, menus, depts, dicts, posts, tenants) entirely through UI — no Postman / SQL.

**Prerequisite reading**: `PHASE_5A_SUMMARY.md` (baseline + decisions). Treat that doc as canonical reference; don't redecide settled items.

---

## DoD Phase 5B

Functional acceptance:

- [ ] Multi-tab UI: click sider menu → opens tab. Multiple tabs open simultaneously, switch instantly via tab-bar above content. Close per-tab, close-others, close-all.
- [ ] System User CRUD page: search form + paginated table + create/edit modal + delete confirm + reset-password action. URL preserves filter/page state — sharable link.
- [ ] Same CRUD pattern repeated for: system/role, system/menu, system/dept, system/dict, system/post, system/tenant. Each ~1-2h once template chốt.
- [ ] Buttons + sider menu items gate by permission. Non-admin user sees subset of UI.
- [ ] `parentTabKey` BE field consumed — detail pages highlight parent list menu (when first detail page lands).

Quality:

- [ ] Smoke test `PHASE_5A_SMOKE_TEST.md` still passes (no regression).
- [ ] All new tech debt tracked.
- [ ] No new Chinese comments. No dev-only workarounds.

---

## 4 core tasks

| Task                                 | Output                                                                                                                                                       | Est   | Depends on                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------------- |
| **1. tagsView UI**                   | `tags-view-slice.ts` full impl + `TabBar` component + context menu (close/close-others/close-all/refresh). Multi-tab navigation, content swap by activeTabId | 4-6h  | —                                  |
| **2. First CRUD page `system/user`** | `pages/system/user/index.tsx` full impl + `useUrlTableState` hook + skill template `skills/crud-page.md` codified                                            | 6-10h | Task 1 (tabs hold open page state) |
| **3. `parentTabKey` field**          | BE migration + DTO + FE type + sider-menu use it. Required only when first detail page lands. Could defer further                                            | 2h    | — (BE work parallel with Task 2)   |
| **4. Permission gating**             | `usePermission()` hook + `<HasPermission>` component + sider menu filter + button gates applied to Task 2 page                                               | 3-4h  | Task 2 (need real buttons to gate) |

**Core total**: ~15-22h.

After core, port remaining CRUD pages (role, menu, dept, dict, post, tenant + infra/config, file, job): ~12-16h additional. **Total Phase 5B**: 5-6 weeks part-time.

---

## Recommended task order

```
1. tagsView UI                  ← infrastructure for all later pages
   ↓
2. system/user CRUD             ← template, heaviest task (codify pattern)
   ↓
4. Permission gating            ← apply to task 2's buttons
   ↓
Port loop (one at a time):
  system/role  → system/menu → system/dept → system/dict
  system/post  → system/tenant
  infra/config → infra/file  → infra/job
   ↓
3. parentTabKey                 ← only when first detail page actually needed
   ↓
Phase 5B done
```

---

## Decisions Long needs to chốt at session start

### Q1 — Form pattern: Modal vs Drawer

| Option              | Pros                                                      |
| ------------------- | --------------------------------------------------------- |
| **A. Modal** (vote) | Yudao 1:1. Classic. Smaller forms ok.                     |
| B. Drawer           | Side panel, less intrusive, more space for complex forms. |

Vote A. Long?

### Q2 — Table row actions: inline vs dropdown

| Option               | Pros                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| **A. Inline** (vote) | `[Edit] [Delete] [Reset password]` per row. Visible, fast click. Works ≤3 actions. |
| B. Dropdown          | `[Actions ▼]` per row. Cleaner table, scales to N actions.                         |

Vote A — most pages have 2-3 actions. Switch dropdown if a page needs >3.

### Q3 — When to extract `<CrudTable>` wrapper

| Option                                                    | Rationale                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A. Build wrapper in Task 2 from the start                 | Saves time on subsequent ports.                                              |
| **B. Build raw in Task 2, extract after 2nd page** (vote) | Rule of Three. Avoid premature abstraction — 2nd page reveals true patterns. |

Vote B. Long?

Plus 2 minor Q likely to surface during Task 1:

- Tab switch animation vs jump-cut → Vote jump-cut (faster perceived).
- Tab title source: menu name vs custom override per page? → Vote menu name default, allow override later.

---

## Reference materials for next session

Long should upload to next session:

1. **`PHASE_5A_SUMMARY.md`** — canonical baseline. Always reference.
2. **`PHASE_5A_SMOKE_TEST.md`** — re-run to confirm baseline before starting + after each major task.
3. **`PHASE_5B_KICKOFF.md`** — this doc.
4. **`CONVERSATION_SUMMARY_20260610_PHASE_5A_DONE.md`** — session handoff context.

Optional uploads (if cross-reference needed):

- `soar-be.zip` — BE source for verifying DTO shapes (especially for `system_user` endpoints in Task 2).
- `yudao-ui-admin-vue3.zip` — pattern reference for CRUD page + tagsView UI. Phase 5B Task 1 + Task 2 will need this.

Don't upload all the A1-D4 markdown deliverables — they're historical. Summary docs suffice.

---

## Suggested first message for next session

Something like:

> Tiếp tục Soar Phase 5B. Đã có Phase 5A baseline functional. Đã upload PHASE_5A_SUMMARY + SMOKE_TEST + PHASE_5B_KICKOFF + CONVERSATION_SUMMARY. Bắt đầu task 1 — tagsView UI.
>
> Trước khi vào code, confirm 3 Q trong KICKOFF: A, A, B.

Then Claude reads the docs, acks decisions, and starts Task 1 deliverable.

---

## Out of Phase 5B scope (Phase 5C+)

To prevent scope creep:

- `<Activity>` keep-alive for tabs with `keepAlive=true` → Phase 5C.
- Real avatar upload + profile page → Phase 5C.
- Notification center / system messages → Phase 5C.
- Dashboard with charts → Phase 5D.
- Mobile responsive tweaks → Phase 5D.
- i18n menu labels (#14) → Phase 5C polish batch.
- ErrorBoundary (#17) → Phase 5C polish batch.

Stay focused on system + infra module CRUD + multi-tab UI + permissions.

---

## Risks to flag at session start

- **Skill template lock-in**: Task 2 codifies `skills/crud-page.md`. If template flaws not caught early, all subsequent CRUD pages inherit them. Recommend reviewing template after Task 2 + Task 4 done, before porting role/menu/etc.
- **antd v6 `App.useApp()` migration** (tech debt #11): static `Modal.confirm` and `message.error` work but lack ConfigProvider context. If Phase 5B forms use these heavily and theme breaks, may need to address mid-phase.
- **`parentTabKey` timing**: if first detail page lands earlier than expected (e.g., "View user details" button on `system/user`), Task 3 BE migration becomes blocker. Long should decide if detail page is in Task 2 scope or deferred.

---

**End of kickoff plan. Read PHASE_5A_SUMMARY for baseline, then start Task 1.**
