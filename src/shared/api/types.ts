/**
 * Common API response/request shapes shared across all features.
 * BE source of truth: `soar-be/soar-framework/soar-spring-boot-starter-common`
 * — `CommonResult.java` and `PageResult.java`.
 */

/** BE wraps every response. `code === 0` means success. */
export interface CommonResult<T> {
  code: number
  data: T
  msg: string
}

/** BE pagination envelope. */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** BE pagination request params — extend per-feature for filters/sort. */
export interface PageParam {
  pageNo: number
  pageSize: number
}
