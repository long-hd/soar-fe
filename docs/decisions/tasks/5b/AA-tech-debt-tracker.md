# AA — Tech Debt Tracker

> Inserted between A3 and A4. Consolidates ~30 scattered debt items into a single tracker + codifies maintenance protocol.

---

## Scope

2 file touches:

1. `TECH_DEBT.md` — NEW at repo root — consolidated tracker (see separate deliverable file)
2. `AGENTS.md` — PATCH — add Tech Debt Protocol section after `## Communication & Decisions` (~line 369)

---

## 1. `TECH_DEBT.md` (new at repo root)

See separate deliverable file `TECH_DEBT.md` in this output. Highlights:

- **23 open items** consolidated from 6 sources (PHASE_5A_SUMMARY §6, T1.0 TV-A..E, A1-TD1..3, A2-TD1..4, A3-TD1..3, KICKOFF implicit)
- **10 resolved items** including #5 from T1
- **Dedupe**: A3-TD1 ≡ A2-TD1 (same sessionStorage gap) → A3-TD1 dropped, A2-TD1 marked "covers dept + post + dict"
- **Dedupe**: A2-TD3 ≡ #14 (both i18n labels) → kept both with cross-ref `Cross-ref: #14`
- **Severity rated**: 1 high (#11 antd App.useApp), 5 medium, 17 low
- Format: 3 sections (Open by severity / Resolved chronological / Severity Drift Review log)

### Distribution snapshot

| Phase opened       | Open   | Resolved                    |
| ------------------ | ------ | --------------------------- |
| 5A heritage        | 9      | 9                           |
| 5B/T1 (tagsView)   | 5      | 0                           |
| 5B/A1 (permission) | 3      | 0                           |
| 5B/A2 (dict)       | 4      | 0                           |
| 5B/A3 (dept)       | 1      | 0                           |
| 5B/AA (this)       | 0      | 0                           |
| **Total**          | **22** | **9** + #5 from T1 = **10** |

Most items are **low** ("defer-by-design" — intentional simplifications, not real bugs). The 1 **high** + 5 **medium** are the focus list — short enough to scan in a glance, which was the goal.

---

## 2. `AGENTS.md` (patch — add new section)

**Insert this section** between `## Communication & Decisions` and `## Verification Checklist`:

```markdown
## Tech Debt Protocol

Block deliverables document new tech debt inline for reviewer self-containment, but the single source of truth is `TECH_DEBT.md` at repo root.

### After each block applies

1. **New debt** → append to `TECH_DEBT.md` § Open under the appropriate severity, with full schema (ID, Severity, Status=open, Opened, Target, Cross-ref, Notes).
2. **Resolved debt** → move from § Open to § Resolved with date suffix `(YYYY-MM-DD)`.
3. **Inline docs stay** — block deliverable `## Tech debt opened by X` sections are NOT removed. They mirror the tracker for reviewer context. The tracker is the canonical view.

### ID conventions

| Era                   | Format                                                  | Example      |
| --------------------- | ------------------------------------------------------- | ------------ |
| Phase 5A heritage     | `#<N>`                                                  | `#11`, `#14` |
| Phase 5B+             | `<Block>-TD<N>` (no phase prefix within active session) | `A2-TD1`     |
| Cross-phase ambiguous | `<Phase>/<Block>-TD<N>`                                 | `5B/A2-TD1`  |

IDs are **immutable** once assigned. Don't renumber on dedupe — use cross-ref instead.

### Severity ladder

- **critical** — Blocks current block from shipping. Resolve before continuing.
- **high** — Will hit during current or next phase. Plan resolution into the next 1-2 blocks.
- **medium** — Visible quality gap. Fix when convenient, but don't block flow.
- **low** — Defer-by-design or "if observed". Many will resolve naturally as scope expands; many will never be resolved (acceptable).

### Severity drift review

At the start of each new Phase (5C, 6A, etc.):

1. Scan all `open` items.
2. Items unresolved across 2+ phases: re-rate severity, OR close as `wontfix` with rationale, OR confirm parking with new Target.
3. Log review in `TECH_DEBT.md` § Severity Drift Review table.

### When to update vs. defer

| Trigger                                             | Action                                                          |
| --------------------------------------------------- | --------------------------------------------------------------- |
| Block deliverable ships an inline tech-debt section | **Mirror to tracker immediately** as part of that block         |
| Block resolves an existing item                     | **Move to Resolved** as part of that block                      |
| Mid-block discovery of a new gap                    | Add to tracker in the same block deliverable that introduces it |
| External feedback (production bug, audit)           | Add ad-hoc; doesn't require a "block"                           |

### Dedupe rule

If two items describe the same root cause (e.g., A2-TD1 + A3-TD1 both about lookup persistence):

- Keep the **earliest** ID
- Update its Title + Notes to cover the broader scope
- Drop the later ID (don't add it to tracker), but record the dedupe in the block deliverable's inline section: `(deduped with X — single resolution covers both)`

This prevents tracker bloat without losing context.
```

---

## Notes

### Why a static markdown file and not Issues / Jira

- Single-developer team currently. Issue trackers have overhead beyond benefit at this scale.
- `git log TECH_DEBT.md` gives full history of debt evolution — same audit trail as commits.
- Diff-reviewable in PRs (when team grows).
- Plain text travels with the codebase forever.
- Migration path to Issues later is straightforward (1 row → 1 issue, automatable).

### Why "Severity Drift Review" is manual, not auto-rule

Auto-rules ("open >3 phases → escalate") are tempting but oversimplify:

- "Open >3 phases" doesn't capture WHY — sometimes long-lived debt is correctly parked
- Manual review at phase boundaries forces honest assessment rather than rule-following
- Phase 5B has 5-6 blocks; reviewing 23 items once at phase boundary is ~15 minutes

### Why open count isn't a metric to minimize

Tempting to treat "low" items as failures to fix. They're not. Most "low" items are:

- **Intentional scope limits** (e.g., A1-TD3 no permission enum — yudao parity)
- **YAGNI markers** (e.g., TV-A drag-reorder — won't matter unless requested)
- **Optimization targets, not bugs** (e.g., A3-TD2 tree rebuild perf)

The tracker exists to **prevent forgetting**, not to **pressure resolution**. A long "low" list is fine if the "high" + "medium" lists stay short.

### Process risk

Risk: **tracker drift** — block deliverables ship inline debt but I forget to mirror. Long can't catch this without manually diffing every block.

Mitigation: every block deliverable from AA onward will have a final section "Tracker updates" listing the exact rows to add/move. Long can `cat TECH_DEBT.md` against that section to verify sync.

Starting with A4 (next block), this protocol applies.

---

## Apply checklist

- [ ] Create `TECH_DEBT.md` at repo root (use the separate deliverable file from this output).
- [ ] Patch `AGENTS.md` — insert "Tech Debt Protocol" section between `## Communication & Decisions` and `## Verification Checklist`.
- [ ] Verify counts in `TECH_DEBT.md § Stats snapshot` match what you actually pasted (sanity check against block docs).
- [ ] (Optional) `git add TECH_DEBT.md AGENTS.md && git commit -m "chore: codify tech debt tracker (AA)"`

---

## Tracker updates (for AA itself)

No new debt opened by AA — this block only restructures existing tracking. After AA applies, tracker stats should match exactly:

- Open: 23
- Resolved: 10
- AA opens: 0
- AA resolves: 0

---

**End AA. Awaiting confirmation. Next: A4 — Post infra (last lookup module).**
