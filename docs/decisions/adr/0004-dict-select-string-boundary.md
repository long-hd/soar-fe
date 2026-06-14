# 0004. DictSelect string-boundary (form↔domain conversion)

- Date: 2026-06-13 (extracted from task T2.2.1 hotfix)
- Status: Accepted
- Tags: forms, dict, frontend
- Related: tasks/5b/T2.2-user-list-page.md (initial bug), `<DictSelect>` from A2

## Context

BE dictionaries store values as `varchar` — e.g., `common_status` has values `"0"` (Enabled) and `"1"` (Disabled). The `/dict-data/simple-list` endpoint returns:

```json
[
  { "dictType": "common_status", "value": "0", "label": "Enabled", ... },
  { "dictType": "common_status", "value": "1", "label": "Disabled", ... }
]
```

The `<DictSelect>` shared component (from foundation block A2) renders these as antd `<Select>` options with `value: item.value` (string).

Domain DTOs, however, type these fields as `number` to match BE Java enum ordinals on read/write sides:

```ts
interface UserRespDTO {
  status: number // 0 | 1, matching CommonStatusEnum
  // ...
}
```

This created a type/runtime mismatch in T2.2 search form. Initial attempt used `Form.Item normalize` to convert string → number at form layer:

```tsx
<Form.Item name="status" normalize={v => (v == null ? v : Number(v))}>
  <DictSelect dictType="common_status" />
</Form.Item>
```

**Bug observed**: after user selected "Enabled", Select displayed `0` (raw number) instead of label "Enabled". Root cause: `normalize` converted form value to `0: number`. Select then searched its options for `value === 0` (number), but options had `value: "0"` (string). Equality fails → no option matches → Select falls back to rendering raw value.

The form layer can't unilaterally win the type war: DictSelect emits strings (matching BE dict shape), DTOs need numbers (matching BE enum shape). One of them must yield.

## Decision

**Form values stay string** for dict-typed fields. **Conversion happens at the form↔domain boundary** — i.e., at submit time (form value → DTO) and at load time (DTO → form value):

```tsx
// Form state: status: string | undefined
interface SearchFormValues {
  status?: string // ← string, matches DictSelect emit
}

// On submit (string → number for DTO)
const handleFinish = (values: SearchFormValues) => {
  const filters: UserFilters = {
    status: values.status == null || values.status === '' ? undefined : Number(values.status),
  }
  onSearch(filters)
}

// On load (number → string for setFieldsValue). `open` in deps so reopening
// the same edit target (cached data, unchanged reference) refires after the
// reset useEffect — see CONVENTIONS § Form + Modal "Form instance lifecycle".
useEffect(() => {
  if (!open || !detailQuery.data) return
  form.setFieldsValue({
    status: detailQuery.data.status == null ? undefined : String(detailQuery.data.status),
  })
}, [open, detailQuery.data, form])
```

**No `Form.Item normalize`** for dict-typed fields. Conversion is explicit at the 2 boundary points only.

## Alternatives considered

**A. Normalize at Form.Item (initial attempt).**
Rejected: breaks Select display because option values become string-typed at the form layer.

**B. Change `<DictSelect>` to emit numbers.**
Considered: would require parsing `item.value: string` to `Number(item.value)` inside DictSelect. Rejected because: (1) dict values aren't always numeric — some dict types use string codes like `"male"`/`"female"` (Soar doesn't yet, but BE schema allows). (2) Coupling DictSelect to numeric semantics breaks the abstraction.

**C. Change DTO types to `string` for dict fields.**
Rejected: would diverge from BE Java enum semantics and require conversion at API call sites for any non-form code that uses these values.

**D. (Chosen) Form value stays string; convert at submit + load boundaries.**

## Consequences

### Positive

- Select displays correctly (option lookup matches on string equality).
- DTOs remain numerically typed, matching BE.
- Pattern is explicit at conversion sites — readers see the type bridge.
- Reusable for any dict-typed field across any feature.

### Negative

- "DictSelect tax": every form binding to a dict field needs 2 conversion sites (load + submit). Easy to forget.
- TS won't catch missing conversion — form may submit string where DTO expects number. Runtime: BE will reject with validation error. UX worse than compile-time catch.

### Risks

- Future BE change: if a dict's values were ever changed from string to number storage, all FE conversion sites would silently start producing `NaN` (Number conversion of a number gives the number, but if BE sends `0: number` directly, `String(0) === "0"` and lookup still works — actually safe). Low risk.

### Follow-ups

- Pattern codified in `skills/crud-page/` lessons-learned section.
- A future helper hook could encapsulate: `useDictFormField(name: string)` returning the field + auto-conversion. Not built — Rule of Three not yet hit.

## References

- Component: `src/shared/components/dict-select.tsx`
- Foundation block: `tasks/5b/A2-dict-infra.md`
- Bug discovery: `tasks/5b/T2.2-user-list-page.md` + chat history T2.2.1 hotfix
- Example application: `src/features/system/user/components/user-form-modal.tsx` (sex field), `user-search-form.tsx` (status field)
