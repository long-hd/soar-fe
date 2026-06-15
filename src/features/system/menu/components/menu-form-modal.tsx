import { App, Col, Form, Input, InputNumber, Modal, Row, Spin, Switch } from 'antd'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DictSelect } from '@/shared/components/dict-select'
import { MenuTreeSelect } from '@/shared/components/menu-tree-select'
import { buildTreeFromFlat, collectDescendantIds } from '@/shared/lib/tree'

import { MENU_DICT_TYPES, MENU_STATUS, MENU_TYPE } from '../constants'
import { useMenuDetailQuery, useMenuFullListQuery, useMenuMutations } from '../hooks'
import type { MenuRespDTO, MenuSaveReqDTO } from '../types'
import { MenuTypeSelect } from './menu-type-select'

interface MenuFormModalProps {
  open: boolean
  /** undefined = create mode, set = edit mode for that menu id. */
  id?: number
  /** Pre-set parent when creating a child menu. */
  parentIdPreset?: number
  onClose: () => void
}

interface FormValues {
  name: string
  type: number
  parentId?: number
  sort: number
  status: string
  icon?: string
  path?: string
  tabKey?: string
  component?: string
  componentName?: string
  keepAlive?: boolean
  visible?: boolean
  alwaysShow?: boolean
  permission?: string
}

/**
 * Unified create + edit modal for menus.
 * Form fields vary by selected menu type (DIR / MENU / BUTTON).
 * Type is immutable after create (disabled on edit).
 */
export function MenuFormModal({ open, id, parentIdPreset, onClose }: MenuFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = id != null
  const menuType = Form.useWatch('type', form)

  const modalWidth = menuType === MENU_TYPE.MENU ? 720 : menuType === MENU_TYPE.BUTTON ? 480 : 600

  const { create, update } = useMenuMutations()
  const detailQuery = useMenuDetailQuery(id, { enabled: open && isEdit })

  const fullListQuery = useMenuFullListQuery({ enabled: open })
  const fullFlatList = useMemo(() => fullListQuery.data ?? [], [fullListQuery.data])
  const parentPickerLocked = isEdit && fullListQuery.isLoading

  const disabledIds = useMemo(() => {
    if (!isEdit || id == null || fullFlatList.length === 0) return undefined
    const fullTree = buildTreeFromFlat(fullFlatList, {
      getId: m => m.id,
      getParentId: m => m.parentId,
    })
    return [id, ...collectDescendantIds(fullTree, id, m => m.id)]
  }, [isEdit, id, fullFlatList])

  const tabKeyValidator = useMemo(
    () =>
      (_: unknown, value: string | undefined): Promise<void> => {
        if (!value?.trim()) return Promise.resolve()
        const duplicate = fullFlatList.some(
          (m: MenuRespDTO) => m.type === MENU_TYPE.MENU && m.tabKey === value.trim() && m.id !== id,
        )
        if (duplicate) {
          return Promise.reject(new Error(t('systemMenu.form.tabKeyDuplicate')))
        }
        return Promise.resolve()
      },
    [fullFlatList, id, t],
  )

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  useEffect(() => {
    if (!open || !detailQuery.data) return
    const m = detailQuery.data
    form.setFieldsValue({
      name: m.name,
      type: m.type,
      parentId: m.parentId === 0 ? undefined : m.parentId,
      sort: m.sort,
      status: String(m.status),
      icon: m.icon,
      path: m.path,
      tabKey: m.tabKey,
      component: m.component,
      componentName: m.componentName,
      keepAlive: m.keepAlive ?? true,
      visible: m.visible ?? true,
      alwaysShow: m.alwaysShow ?? true,
      permission: m.permission,
    })
  }, [open, detailQuery.data, form])

  useEffect(() => {
    if (!open || isEdit) return
    if (parentIdPreset != null) {
      form.setFieldsValue({ parentId: parentIdPreset })
    }
  }, [open, isEdit, parentIdPreset, form])

  const isSubmitting = create.isPending || update.isPending

  const buildSaveDto = (values: FormValues): MenuSaveReqDTO => {
    const type = values.type
    const dto: MenuSaveReqDTO = {
      name: values.name.trim(),
      type,
      parentId: values.parentId ?? 0,
      sort: values.sort,
      status: Number(values.status),
    }

    if (type === MENU_TYPE.DIR) {
      dto.icon = values.icon?.trim() || undefined
      dto.path = values.path?.trim() || undefined
      dto.visible = values.visible
      dto.alwaysShow = values.alwaysShow
    } else if (type === MENU_TYPE.MENU) {
      dto.tabKey = values.tabKey!.trim()
      dto.component = values.component!.trim()
      dto.componentName = values.componentName?.trim() || undefined
      dto.icon = values.icon?.trim() || undefined
      dto.path = values.path?.trim() || undefined
      dto.visible = values.visible
      dto.keepAlive = values.keepAlive
      dto.alwaysShow = values.alwaysShow
    } else if (type === MENU_TYPE.BUTTON) {
      dto.permission = values.permission!.trim()
    }

    return dto
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const dto = buildSaveDto(values)

    if (isEdit) {
      await update.mutateAsync({ ...dto, id })
    } else {
      await create.mutateAsync(dto)
    }

    onClose()
  }

  const handleCancel = () => {
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    appModal.confirm({
      title: t('systemMenu.modal.discardChanges'),
      okText: t('systemMenu.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && detailQuery.isLoading

  const parentIdField = (
    <Form.Item name="parentId" label={t('systemMenu.form.parentId')}>
      <MenuTreeSelect
        allowClear
        placeholder={t('systemMenu.form.parentIdPlaceholder')}
        disabledIds={disabledIds}
        disabled={parentPickerLocked}
        loading={parentPickerLocked}
      />
    </Form.Item>
  )

  const nameField = (
    <Form.Item
      name="name"
      label={t('systemMenu.form.name')}
      rules={[
        { required: true, message: t('systemMenu.form.nameRequired') },
        { max: 50, message: t('systemMenu.form.nameLength') },
      ]}
    >
      <Input placeholder={t('systemMenu.form.namePlaceholder')} />
    </Form.Item>
  )

  const sortField = (
    <Form.Item
      name="sort"
      label={t('systemMenu.form.sort')}
      rules={[{ required: true, message: t('systemMenu.form.sortRequired') }]}
    >
      <InputNumber
        placeholder={t('systemMenu.form.sortPlaceholder')}
        min={0}
        style={{ width: '100%' }}
      />
    </Form.Item>
  )

  const statusField = (
    <Form.Item
      name="status"
      label={t('systemMenu.form.status')}
      rules={[{ required: true, message: t('systemMenu.form.statusRequired') }]}
    >
      <DictSelect dictType={MENU_DICT_TYPES.status} placeholder={t('systemMenu.form.status')} />
    </Form.Item>
  )

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'systemMenu.modal.editTitle' : 'systemMenu.modal.createTitle')}
      width={modalWidth}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isSubmitting}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
    >
      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description={t('systemMenu.modal.loading')} />
        </div>
      ) : (
        <Form
          form={form}
          autoComplete="off"
          layout="vertical"
          initialValues={
            isEdit
              ? undefined
              : {
                  type: MENU_TYPE.DIR,
                  status: String(MENU_STATUS.ENABLED),
                  visible: true,
                  alwaysShow: true,
                  keepAlive: true,
                }
          }
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="type"
                label={t('systemMenu.form.type')}
                rules={[{ required: true, message: t('systemMenu.form.typeRequired') }]}
              >
                <MenuTypeSelect disabled={isEdit} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type') as number

              if (type === MENU_TYPE.DIR) {
                return (
                  <div key="menu-form-dir">
                    <Row gutter={16}>
                      <Col span={12}>{nameField}</Col>
                      <Col span={12}>{parentIdField}</Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="icon" label={t('systemMenu.form.icon')}>
                          <Input placeholder={t('systemMenu.form.iconPlaceholder')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>{sortField}</Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>{statusField}</Col>
                      <Col span={8}>
                        <Form.Item
                          name="visible"
                          label={t('systemMenu.form.visible')}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="alwaysShow"
                          label={t('systemMenu.form.alwaysShow')}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )
              }

              if (type === MENU_TYPE.MENU) {
                return (
                  <div key="menu-form-menu">
                    <Row gutter={16}>
                      <Col span={12}>{nameField}</Col>
                      <Col span={12}>{parentIdField}</Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="tabKey"
                          label={t('systemMenu.form.tabKey')}
                          rules={[
                            { required: true, message: t('systemMenu.form.tabKeyRequired') },
                            { max: 100, message: t('systemMenu.form.tabKeyLength') },
                            { validator: tabKeyValidator },
                          ]}
                        >
                          <Input placeholder={t('systemMenu.form.tabKeyPlaceholder')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="path"
                          label={t('systemMenu.form.path')}
                          rules={[{ max: 200, message: t('systemMenu.form.pathLength') }]}
                        >
                          <Input placeholder={t('systemMenu.form.pathPlaceholder')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="component"
                          label={t('systemMenu.form.component')}
                          rules={[
                            { required: true, message: t('systemMenu.form.componentRequired') },
                            { max: 200, message: t('systemMenu.form.componentLength') },
                          ]}
                        >
                          <Input placeholder={t('systemMenu.form.componentPlaceholder')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="componentName" label={t('systemMenu.form.componentName')}>
                          <Input placeholder={t('systemMenu.form.componentNamePlaceholder')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="icon" label={t('systemMenu.form.icon')}>
                          <Input placeholder={t('systemMenu.form.iconPlaceholder')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>{sortField}</Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={6}>{statusField}</Col>
                      <Col span={6}>
                        <Form.Item
                          name="visible"
                          label={t('systemMenu.form.visible')}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="keepAlive"
                          label={t('systemMenu.form.keepAlive')}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name="alwaysShow"
                          label={t('systemMenu.form.alwaysShow')}
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )
              }

              if (type === MENU_TYPE.BUTTON) {
                return (
                  <div key="menu-form-button">
                    <Row gutter={16}>
                      <Col span={12}>{nameField}</Col>
                      <Col span={12}>{parentIdField}</Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          name="permission"
                          label={t('systemMenu.form.permission')}
                          rules={[
                            { required: true, message: t('systemMenu.form.permissionRequired') },
                            { max: 100, message: t('systemMenu.form.permissionLength') },
                          ]}
                        >
                          <Input placeholder={t('systemMenu.form.permissionPlaceholder')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>{sortField}</Col>
                      <Col span={12}>{statusField}</Col>
                    </Row>
                  </div>
                )
              }

              return null
            }}
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
