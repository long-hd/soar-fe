# 0003. i18n single-namespace + per-domain file split

- Date: 2026-06-13 (extracted from task T2.0b)
- Status: Accepted
- Tags: i18n, frontend
- Related: tasks/5b/T2.0b-i18n-namespaces.md

## Context

Phase 5A used a single flat `en.json` (and `vi.json`) for all translations. As features land in Phase 5B, the file grows fast — each CRUD page adds ~30-50 keys (page title, table columns, search labels, form fields, validation messages, action labels, modal titles, confirmation messages, success/error toasts).

Projected: by end of port loop (5+ CRUD pages), each locale file would be 500-1000+ lines — slow to edit, hard to diff, painful for translators handling per-domain string sets.

i18next's native multi-namespace feature solves the file-split problem but adds API ceremony:

```tsx
const { t } = useTranslation('system-user')
t('page.title') // within namespace
t('common:save') // cross-namespace explicit
```

Components consuming multiple namespaces need `useTranslation(['ns1', 'ns2'])` array form + `t('ns:key')` colon notation. This was tried in T2.0b v1 — rejected by Long as "quá lằng nhằng" (too verbose).

## Decision

**Per-domain JSON files** for organizational benefit, **single runtime namespace** for API simplicity. Achieved by spread-merging file imports at i18next init time.

Each file has one top-level key matching its domain:

```
locales/en/
  common.json       → { "common":      { ... } }
  app-shell.json    → { "appShell":    { ... } }
  system-user.json  → { "systemUser":  { ... } }
  ...
```

i18next init spreads them into a single `translation` namespace:

```ts
const enResources = {
  ...enCommon,      // { common: {...} }
  ...enAppShell,    // { appShell: {...} }
  ...enSystemUser,  // { systemUser: {...} }
  ...
}

i18n.init({
  resources: { en: { translation: enResources }, vi: { ... } },
  defaultNS: 'translation',
  // ...
})
```

Component code stays simple — no namespace argument needed:

```tsx
const { t } = useTranslation()
t('common.save')
t('appShell.logout')
t('systemUser.actions.create')
```

Type safety via module augmentation: each file's TS shape is intersected into a single `translation` type. Autocomplete + typo detection work for every key.

## Alternatives considered

**A. Keep single flat file.**
Rejected: 1000+ lines per locale unmaintainable. Translator workflow needs per-domain split.

**B. Native i18next multi-namespace.**
Rejected: every component needs explicit `useTranslation('ns')`. Cross-namespace requires colon syntax. Verbose for the only benefit (lazy loading) that doesn't apply to Soar (translations bundle locally at build).

**C. Per-locale folder with build-time merge tool.**
Custom Vite plugin to glob `locales/en/*.json` and merge at build. Rejected: extra tooling for what 5 lines of import + spread achieves. Plugin maintenance burden > value.

**D. (Chosen) File split + runtime merge into single namespace.**

## Consequences

### Positive

- Translator-friendly: one file per domain, easy to diff/review.
- Component code unchanged from single-file pattern — no migration burden when feature lands.
- Adding a new domain: create JSON file + add 2 import + spread lines in resource aggregator + 2 lines in `types.d.ts`. ~5 lines total per domain.
- Type augmentation merges naturally via TS intersection of file shapes.
- Bundle size identical to single-file (Vite tree-shakes JSON imports).

### Negative

- Top-level keys must not collide across files (mitigated: convention requires top-level key = filename without `.json`, so `common.json` → `common: {...}`).
- Vietnamese files must mirror English structure exactly (no automated CI check — drift possible). Tracked as low-severity tech debt.
- Manual `index.ts` and `types.d.ts` updates when adding a new namespace file (forgettable). Mitigated by adding it to the CRUD-page skill checklist.

### Risks

- If a future requirement needs true per-namespace lazy loading (e.g., bundle splitting for huge translation volumes), this design needs migration to native multi-ns. Currently no such requirement.

### Follow-ups

- `docs/decisions/tasks/5b/T2.0b-i18n-namespaces.md` documents the initial migration step-by-step.
- Subsequent CRUD pages add their own `<module>-<entity>.json` file under this pattern.

## References

- Task deliverable: `tasks/5b/T2.0b-i18n-namespaces.md`
- Aggregator: `src/shared/i18n/resource/resource.en.ts` + `resource.vi.ts`
- i18n init: `src/shared/i18n/index.ts`
- Type augmentation: `src/shared/i18n/types.d.ts`
