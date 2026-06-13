# 0002. API method unwraps `CommonResult` internally

- Date: 2026-06-13 (retroactive — extracted from Phase 5A http-client setup)
- Status: Accepted
- Tags: http, frontend

## Context

The BE wraps every response in `CommonResult<T>`:

```json
{ "code": 0, "data": <payload>, "msg": "..." }
```

- `code === 0` → success, payload is in `data`
- `code !== 0` → business error, `msg` describes it

Two layers can unwrap:

- **Interceptor** (single point): rewrites `response.data` to be `data.data` before resolving the axios promise. Callers see plain payload everywhere.
- **API method** (per-method): `userApi.get(id)` ends with `.then(r => r.data.data)`. Callers see plain payload only when going through the method.

yudao's Vue3 uses interceptor-level unwrap. It's terser at call sites but creates a type/behavior mismatch — `axios.AxiosResponse<T>` says the response has `.data: T`, but interceptor has secretly made it `.data: T['data']`. TypeScript doesn't catch the mismatch.

## Decision

**API methods unwrap explicitly.** Interceptor stays shape-honest (validates `code === 0`, toasts business errors, but doesn't restructure response).

Method pattern:

```ts
page(params: UserPageReqParams): Promise<PageResult<UserRespDTO>> {
  return request
    .get<CommonResult<PageResult<UserRespDTO>>>(`${BASE}/page`, { params })
    .then(r => r.data.data)
}
```

The return type matches the unwrapped value. Callers get a clean domain DTO. Interceptor signature stays accurate.

## Alternatives considered

**A. Interceptor unwraps globally (yudao parity).**
Rejected: TypeScript types lie about response shape. Migrating types to match means callers either type-as-any or fight axios types. Long-term maintenance cost > terseness gain.

**B. No unwrap anywhere — caller does `.data.data` at every site.**
Rejected: verbose, error-prone. Caller might `.data.code` once and miss `.data` everywhere else.

**C. (Chosen) API methods unwrap; interceptor stays shape-honest.**

**D. Generic wrapper utility `unwrap<T>(p: Promise<AxiosResponse<CommonResult<T>>>): Promise<T>`.**
Considered, would reduce boilerplate. Rejected for now: 1 line `.then(r => r.data.data)` is acceptable; adding utility creates indirection for marginal gain. Could revisit if method count grows past ~50.

## Consequences

### Positive

- TypeScript types accurate end-to-end. IDE autocomplete works.
- Interceptor stays single-responsibility (auth header, biz-error toast, refresh-token retry — no shape mutation).
- Callers who legitimately need `code`/`msg` can bypass the api method and call axios directly.
- Pattern is explicit and discoverable — new contributors see `.then(r => r.data.data)` and understand the convention from one example.

### Negative

- Every api method has identical `.then(r => r.data.data)` line.
- Risk of forgetting the unwrap in a new method: caller would receive `CommonResult<T>` instead of `T`, TS would catch (return type mismatch) — failure mode is loud, not silent.

### Risks

- If BE introduces a different response envelope in the future (e.g., `Result<T>` vs `CommonResult<T>`), every method needs touch. Low likelihood — yudao convention stable for years.

### Follow-ups

- None active. Revisit if method count grows enough to justify a generic `unwrap` helper.

## References

- HTTP client: `src/shared/api/http-client.ts`
- Type definitions: `src/shared/api/types.ts` (`CommonResult<T>`, `PageResult<T>`)
- Example: `src/features/system/user/api/index.ts`
- Phase 5A discussion: `../../phases/phase-5a-summary.md` §3.4
