/**
 * DictData module TypeScript types — mirror of BE DTOs:
 *   soar-module-system/.../dict/dto/data/*.java
 */

export type ColorType = 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

export interface DictDataRespDTO {
  id: number
  sort: number
  label: string
  value: string
  dictType: string
  status: number
  colorType?: string
  cssClass?: string
  remark?: string
  createTime: string
}

export interface DictDataSaveReqDTO {
  id?: number
  sort: number
  label: string
  value: string
  dictType: string
  status: number
  colorType?: string
  cssClass?: string
  remark?: string
}

export interface DictDataFilters extends Record<string, unknown> {
  label?: string
  status?: number
}

export type DictDataPageReqParams = {
  pageNo: number
  pageSize: number
  dictType: string
} & DictDataFilters
