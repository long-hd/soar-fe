import { describe, it, expect } from 'vitest'
import { hasPermission } from './permission-matcher'
import { formatDate, formatDateTime } from './format'

describe('shared/lib sanity', () => {
  it('hasPermission: single code', () => {
    expect(hasPermission(['system:user:create'], 'system:user:create')).toBe(true)
    expect(hasPermission(['system:user:create'], 'system:user:delete')).toBe(false)
  })

  it('hasPermission: any-of', () => {
    expect(hasPermission(['a:b:c'], ['x:y:z', 'a:b:c'])).toBe(true)
    expect(hasPermission(['a:b:c'], ['x:y:z', 'p:q:r'])).toBe(false)
  })

  it('hasPermission: wildcard', () => {
    expect(hasPermission(['*:*:*'], 'literally:anything:here')).toBe(true)
  })

  it('formatDate handles null', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('2026-06-07T10:00:00Z')).toBe('2026-06-07')
  })

  it('formatDateTime handles invalid', () => {
    expect(formatDateTime('not-a-date')).toBe('')
  })
})
