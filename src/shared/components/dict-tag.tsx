import { Tag } from 'antd'
import type { ReactNode } from 'react'
import { useDictEntry } from '@/shared/hooks/use-dict-data'

/**
 * Element Plus color name → antd Tag preset color name.
 *
 * BE seeds dict items with `colorType`
 * ("default" | "primary" | "success" | "info" | "warning" | "danger").
 * We map at render time to keep BE seeds legacy-compatible while rendering
 * via antd Tag.
 *
 * Unknown `colorType` values fall back to the default (gray) Tag.
 */
const COLOR_MAP: Record<string, string> = {
  default: 'default',
  primary: 'blue',
  success: 'green',
  info: 'cyan',
  warning: 'orange',
  danger: 'red',
}

interface DictTagProps {
  /** Dict type from BE seed, e.g. "common_status", "user_sex". */
  dictType: string
  /** The raw value to look up. Compared against entry.value as a string. */
  value: string | number | null | undefined
  /**
   * Fallback when the (type, value) lookup misses (loading, unknown value,
   * or null value). Default: render the raw `value` as plain text, or empty
   * string when value is null/undefined.
   */
  fallback?: ReactNode
}

/**
 * Read-only display of a dict value as an antd Tag colored per the BE
 * `colorType` seed.
 *
 * ```tsx
 *   <DictTag dictType="common_status" value={record.status} />
 *   <DictTag dictType="user_sex" value={record.sex} fallback="—" />
 * ```
 *
 * Use inside Table columns:
 *  ``` json
 *   {
 *     title: 'Status',
 *     dataIndex: 'status',
 *     render: (v) => <DictTag dictType="common_status" value={v} />,
 *   }
 * ```
 */
export function DictTag({ dictType, value, fallback }: DictTagProps) {
  const entry = useDictEntry(dictType, value)

  if (!entry) {
    if (fallback !== undefined) return <>{fallback}</>
    return <>{value == null ? '' : String(value)}</>
  }

  const color = entry.colorType ? (COLOR_MAP[entry.colorType] ?? 'default') : 'default'
  return <Tag color={color}>{entry.label}</Tag>
}
