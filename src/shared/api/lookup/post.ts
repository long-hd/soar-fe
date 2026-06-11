import { request } from '@/shared/api/http-client'
import type { CommonResult } from '@/shared/api/types'

/**
 * BE source: PostController.getSimplePostList — returns ENABLE posts only.
 *
 * Posts are flat (no hierarchy unlike dept) — a job position / role within an
 * organization, e.g. "Engineering Manager", "Senior Developer", "QA Lead".
 * Users can have multiple posts (User.postIds: Set<Long>).
 */

export interface PostSimpleDTO {
  id: number
  name: string
}

const URL = '/admin-api/system/post/simple-list'

export async function fetchPostList(): Promise<PostSimpleDTO[]> {
  const res = await request.get<CommonResult<PostSimpleDTO[]>>(URL)
  return res.data.data
}
