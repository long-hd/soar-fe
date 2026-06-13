# 0006. paramsSerializer split for mixed array shapes

- Date: 2026-06-13 (extracted from task T2.2.1 hotfix)
- Status: Accepted
- Tags: http, frontend
- Related: tasks/5b/T2.2-user-list-page.md (bug discovery)

## Context

Spring Boot's parameter binding has different conventions depending on whether the bound target is a primitive list or a POJO list, and whether the source is `@RequestParam` (flat) or DTO field. Soar uses 3 patterns across its API:

| Use case                      | Target shape                                             | Required query string                                           |
| ----------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `DELETE /delete-list?ids=...` | `@RequestParam List<Long> ids`                           | `ids=1&ids=2&ids=3`                                             |
| `GET /page?createTime=...`    | DTO field `Instant[] createTime` (primitive array)       | `createTime=ISO1&createTime=ISO2`                               |
| `GET /page?sortingFields=...` | DTO field `List<SortingField> sortingFields` (POJO list) | `sortingFields[0].field=createTime&sortingFields[0].order=desc` |

The `qs` library (axios default for `paramsSerializer`) has these formats:

- `arrayFormat: 'repeat'` → `?ids=1&ids=2` (works for primitive flat + primitive array in DTO)
- `arrayFormat: 'indices'` → `?ids[0]=1&ids[1]=2` (Spring rejects for primitive, accepts for POJO via Map binding but with `[field]` not `.field`)
- `arrayFormat: 'brackets'` → `?ids[]=1` (Spring rejects)

Critically, **no single qs format produces `[i].field=`** (dot-notation for POJO property access). Spring's POJO binding expects `.field`; `[field]` reads as Map/array key on the POJO and fails with `InvalidPropertyException`.

Initially Soar used `arrayFormat: 'repeat'` globally (Phase 5A decision). Worked fine for `ids` and `createTime`. Broke in T2.2 when `sortingFields` was introduced — Spring saw `?sortingFields=...` as scalar and threw a binding exception.

Switching to `indices` broke the other direction — primitive arrays became `?ids[0]=1` (Spring `@RequestParam` doesn't accept) and POJO got `[field]` not `.field`.

## Decision

**Hand-rolled `serializeParams`** that detects shape per-key and applies the appropriate format:

```ts
function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    !Array.isArray(value[0])
  )
}

function serializeParams(params: Record<string, unknown>): string {
  const flat: Record<string, unknown> = {}
  const nestedParts: string[] = []

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    if (isObjectArray(value)) {
      // POJO list — needs dot-notation
      nestedParts.push(
        qs.stringify(
          { [key]: value },
          { allowDots: true, arrayFormat: 'indices', skipNulls: true },
        ),
      )
    } else {
      flat[key] = value
    }
  }

  const flatPart = qs.stringify(flat, {
    allowDots: true,
    arrayFormat: 'repeat', // ids=1&ids=2
    skipNulls: true,
  })

  return [flatPart, ...nestedParts].filter(Boolean).join('&')
}
```

Two qs calls with different formats, output concatenated. `allowDots: true` is the key — it produces `sortingFields[0].field=value` (with `.field`) instead of `sortingFields[0][field]=value`.

Wired in `axios.create({ paramsSerializer: { serialize: serializeParams } })` — no caller-side change.

## Alternatives considered

**A. Keep `arrayFormat: 'repeat'` globally and serialize sortingFields manually in `userApi.page`.**
Rejected: pushes the fix to every API method that uses sorting (every page). Convention drift across modules likely.

**B. Switch to `arrayFormat: 'indices'`.**
Rejected: breaks primitive arrays (`@RequestParam` doesn't accept `ids[0]=1`).

**C. Use a different HTTP library (e.g., ky, redaxios) with better serialization control.**
Rejected: axios is well-supported across team + ecosystem; swapping is high-cost for marginal value.

**D. Ask BE to accept multiple formats.**
Considered: Spring binding can be customized. Rejected as a backwards-compat fix — better to fix FE side once than maintain custom BE binders.

**E. Custom serializer with `allowDots: true` + shape detection (chosen).**

## Consequences

### Positive

- All 3 Spring binding patterns work in same request.
- Caller code unchanged — fix at axios config layer.
- Detection heuristic simple (one helper function).
- Future BE additions (e.g., nested filter objects) work without serializer touch — as long as the shape is "primitive array" or "POJO array of one level".

### Negative

- Custom serializer logic to maintain (alternative to a library function — but no library covers this combo).
- Edge cases not handled:
  - Arrays of arrays (not used in Soar)
  - Mixed-type arrays (e.g., `[1, "two", {x: 3}]` — not used)
  - Deeply nested POJOs in POJO lists (not used)
- If qs library behavior changes across versions, retest needed.

### Risks

- A future API may introduce a 4th shape (e.g., `List<List<String>>` for nested tags) — would require serializer extension.
- `isObjectArray` heuristic fails if a primitive array's first element is `null` — falls back to `flat`/repeat which is correct for primitives. Safe.

### Follow-ups

- Multi-sort UI not yet implemented but BE already supports `List<SortingField>` — the serializer is forward-compatible. Adding multi-sort just means UI changes; no further serializer work (tracked as low debt A5-TD3).

## References

- Implementation: `src/shared/api/http-client.ts` (`serializeParams` + `isObjectArray`)
- BE binding examples:
  - `UserController.deleteUserList` (`@RequestParam List<Long> ids`)
  - `UserPageReqDTO.createTime: Instant[]`
  - `SortablePageParam.sortingFields: List<SortingField>`
- Task / bug discovery: T2.2 smoke + T2.2.1 hotfix discussion in chat history
