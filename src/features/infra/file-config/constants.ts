// ===== Permission codes =====

export const FILE_CONFIG_PERMISSIONS = {
  query: 'infra:file-config:query',
  create: 'infra:file-config:create',
  update: 'infra:file-config:update',
  delete: 'infra:file-config:delete',
} as const

// ===== Dict types =====

export const FILE_CONFIG_DICT_TYPES = {
  storage: 'infra_file_storage',
} as const

// ===== Storage enum values (BE source of truth) =====

/** Matches BE FileStorageEnum. */
export const FILE_STORAGE = {
  DB: 1,
  LOCAL: 10,
  S3: 20,
} as const

export type FileStorageValue = (typeof FILE_STORAGE)[keyof typeof FILE_STORAGE]

/** Which config fields belong to which storage type — used by submit-gate (Q6). */
export const STORAGE_CONFIG_FIELDS: Record<FileStorageValue, readonly string[]> = {
  [FILE_STORAGE.DB]: ['domain'],
  [FILE_STORAGE.LOCAL]: ['basePath', 'domain'],
  [FILE_STORAGE.S3]: [
    'endpoint',
    'bucket',
    'accessKey',
    'accessSecret',
    'enablePathStyleAccess',
    'enablePublicAccess',
    'region',
    'domain',
  ],
} as const
