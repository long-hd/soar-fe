import type { SortParams } from '@/shared/types/api'

/**
 * User module TypeScript types — mirror of BE DTOs:
 *   soar-module-system/src/main/java/.../user/dto/user/*.java
 *
 * Conventions:
 *  - Numeric BE Long → `number` (JS safe range, BE ids stay under 2^53)
 *  - BE Instant → ISO string (axios JSON parse keeps as string)
 *  - Optional in BE → optional in TS (with `?`)
 *  - Enum values: const objects exported from constants.ts, NOT TS enum
 */

// ===== Response =====

/**
 * Full user object returned by `/page` (table rows) and `/get` (form edit fetch).
 *
 * `deptName` is BE-joined — table column reads it directly, no `useDeptName` lookup.
 */
export interface UserRespDTO {
  id: number
  username: string
  nickname: string
  remark?: string

  deptId?: number
  deptName?: string

  postIds?: number[]

  email?: string
  mobile?: string
  sex?: number
  avatar?: string

  status: number

  loginIp?: string
  loginDate?: string
  createTime: string
}

// ===== Request — Create + Update (unified per legacy + BE) =====

/**
 * Unified create/update payload.
 *  - `id` absent → BE treats as create. `password` required by BE `@AssertTrue isPasswordValid()`.
 *  - `id` present → BE treats as update. `password` ignored on BE side.
 *
 * FE form modal toggles password field visibility based on edit vs create mode;
 * type allows both shapes since BE handles dispatch.
 */
export interface UserSaveReqDTO {
  id?: number
  username: string
  nickname: string
  remark?: string

  deptId?: number
  postIds?: number[]

  email?: string
  mobile?: string
  sex?: number
  avatar?: string

  password?: string
}

// ===== Side endpoints =====

export interface UserUpdateStatusReqDTO {
  id: number
  status: number
}

export interface UserUpdatePasswordReqDTO {
  id: number
  password: string
}

// ===== Search filters =====

/**
 * Filter fields fed to `useTableState<UserFilters>` and serialized into the
 * `/page` request via `useTableState.queryParams`.
 *
 * `createTime` is a tuple of ISO Instant strings matching BE
 *   `@Size(min=2, max=2) Instant[] createTime`. Search form's RangePicker
 *   converts Dayjs range → [start ISO, end ISO] at submit time.
 *
 * Extends `Record<string, unknown>` to satisfy `useTableState`'s generic constraint.
 */
export interface UserFilters extends Record<string, unknown> {
  username?: string
  mobile?: string
  status?: number
  deptId?: number
  createTime?: [string, string]
}

/**
 * Full request shape sent to `/page` — produced by `useTableState.queryParams`.
 * Pre-built here so the API method has an explicit signature.
 */
export type UserPageReqParams = {
  pageNo: number
  pageSize: number
  sortingFields?: SortParams[]
} & UserFilters
