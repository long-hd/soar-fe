export const FILE_PERMISSIONS = {
  query: 'infra:file:query',
  create: 'infra:file:create',
  delete: 'infra:file:delete',
} as const

// MIME type categorization for preview rendering
export const PREVIEWABLE_IMAGE_PREFIX = 'image/'
export const PREVIEWABLE_PDF_TYPE = 'application/pdf'
