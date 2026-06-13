# 0005. Mutations don't accept callbacks — caller chains `await mutateAsync` + UI action

- Date: 2026-06-13 (decided in chat during T2 hooks refactor planning)
- Status: Accepted
- Tags: data-fetching, frontend
- Related: tasks/5b/T2.3-user-form-modal.md, tasks/5b/T2.4-reset-password-modal.md

## Context

After Task 2 ships, mutations are extracted into a feature-scoped hook (`useUserMutations`) that lives at `features/<module>/<entity>/hooks/index.ts`. The hook collects 6 mutations (create, update, remove, removeMany, updateStatus, updatePassword), each handling success-side data work (toast + `invalidateList`).

Each mutation triggers from a different consumer:

- Toolbar Create button → opens modal → modal calls `create.mutateAsync()` → wants to close modal on success
- Toolbar Bulk Delete → calls `removeMany.mutateAsync()` → wants to clear selection on success
- Form modal submit → calls `create.mutateAsync()` or `update.mutateAsync()` → wants to close modal on success
- Reset password submit → calls `updatePassword.mutateAsync()` → wants to close modal on success

Two patterns possible:

**A. Hook accepts callbacks per consumer**:

```ts
useUserMutations({
  onCreateSuccess?: () => void,
  onUpdateSuccess?: () => void,
  // ...
})
```

**B. Hook does data-side effects only (toast + invalidate); caller chains UI side effect via `await mutateAsync`**:

```ts
// in hook
const create = useMutation({
  mutationFn: data => userApi.create(data),
  onSuccess: () => {
    message.success(t('...createSuccess'))
    void invalidateList()
  },
})

// in caller (form modal)
await create.mutateAsync(dto)
onClose()
```

## Decision

**Option B.** Hook only does data-side effects. UI side effects (close modal, clear selection) live at the call site via `await mutateAsync()` chain.

Rationale:

1. **Hook stays generic**. The same hook serves page + form modal + reset modal. If a callback were "close modal", that's irrelevant for the page (no modal to close).
2. **Caller controls timing**. If a future modal wants to delay close 200ms for toast visibility, caller adds `await sleep(200); onClose()`. No hook signature change.
3. **Error path naturally correct**. `mutateAsync` throws on biz error (which the global error-interceptor has already toasted). The throw propagates → `onClose()` never reaches → modal stays open → user retries. Without try/catch wrap, this is the desired behavior.
4. **Hook signature stable across feature growth**. New mutations don't grow the signature, only the return shape.

## Alternatives considered

**A. Callbacks in hook signature (`useUserMutations({ onCreateSuccess })`).**
Rejected:

- Couples hook to consumer UI concerns (e.g., the hook can't know modal exists).
- Memory: each consumer passing new callback identity each render forces useMutation re-creation. Requires `useCallback` wrappers at all call sites.
- Signature grows linearly with mutation count.

**B. Mutation returns observable; caller `.subscribe()`.**
Considered: returning a stream API. Rejected: overkill for binary success/error. TanStack Query already returns Promise from `mutateAsync` — use it.

**C. (Chosen) Hook does data work only; caller chains `await mutateAsync() + UI action`.**

## Consequences

### Positive

- Hook re-usable across multiple consumers without modification.
- Caller code reads top-to-bottom as expected: validate → mutate → close. Natural control flow.
- Error path correct without explicit try/catch — throw propagation just works.
- React Query DevTools shows mutation state cleanly (one mutation, not one per consumer).

### Negative

- Caller must remember the `await` + UI action chain. Forgetting `await` would close modal before mutation completes — UX bug. Mitigated: pattern codified in skill template + smoke tests cover this exact flow.
- If many consumers across many features need same "after mutateAsync, close modal" pattern, code repeats. Acceptable until Rule of Three triggers — then a helper like `useMutationWithClose(mutation, onClose)` could be introduced.

### Risks

- Async throw in onClick handler that's not awaited: React swallows the rejection (logs to console, no crash, no toast). The interceptor already toasted the error so user sees feedback, but the modal-close behavior depends on `await`. If caller wrote `create.mutate(...)` (synchronous fire-and-forget) instead of `await create.mutateAsync(...)`, the chain breaks. Mitigated: lint rule possible (no-floating-promises), but for now, convention + code review.

### Follow-ups

- None active. Pattern stable across T2.3, T2.4. Will be reused throughout port loop.

## References

- Hook implementation: `src/features/system/user/hooks/index.ts`
- Usage examples:
  - `src/features/system/user/components/user-form-modal.tsx` (create/update chain)
  - `src/features/system/user/components/user-reset-password-modal.tsx` (updatePassword chain)
  - `src/features/system/user/pages/user-list-page.tsx` (remove + removeMany chain)
- Task: `tasks/5b/T2.3-user-form-modal.md` (initial mutation usage), `tasks/5b/T2.4-reset-password-modal.md` (reaffirmed pattern)
