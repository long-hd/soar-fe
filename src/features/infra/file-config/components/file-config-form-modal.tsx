import { App, Form, Input, Modal, Radio, Spin } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FILE_CONFIG_DICT_TYPES,
  FILE_STORAGE,
  STORAGE_CONFIG_FIELDS,
  type FileStorageValue,
} from '@/features/infra/file-config/constants'
import {
  useFileConfigDetailQuery,
  useFileConfigMutations,
} from '@/features/infra/file-config/hooks'
import type { FileConfigRespDTO, FileConfigSaveReqDTO } from '@/features/infra/file-config/types'
import { DictSelect } from '@/shared/components/dict-select'

interface FileConfigFormModalProps {
  open: boolean
  configId?: number
  onClose: () => void
}

interface FormValues {
  name: string
  storage: string
  remark?: string
  config?: Record<string, unknown>
}

function buildFormValues(detail: FileConfigRespDTO): FormValues {
  const { master: _master, id: _id, createTime: _createTime, ...rest } = detail
  return {
    name: rest.name,
    storage: String(rest.storage),
    remark: rest.remark,
    config: rest.config,
  }
}

function resolveStorageValue(raw: string | number | undefined): FileStorageValue | undefined {
  if (raw == null || raw === '') return undefined
  return Number(raw) as FileStorageValue
}

/**
 * Create + edit modal for file storage configs.
 *
 * Storage type is immutable on edit (code-immutability pattern).
 * Conditional `config.*` fields render per storage via shouldUpdate.
 * Submit-gate strips config keys not belonging to the selected storage (Q6).
 */
export function FileConfigFormModal({ open, configId, onClose }: FileConfigFormModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const isEdit = configId != null

  const { create, update } = useFileConfigMutations()
  const { data: detail, isLoading: isDetailLoading } = useFileConfigDetailQuery(configId, {
    enabled: open && isEdit,
  })

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (configId != null && detail) {
      form.setFieldsValue(buildFormValues(detail))
    }
  }, [open, configId, detail, form])

  const isSubmitting = create.isPending || update.isPending

  const handleValuesChange = (changed: Partial<FormValues>) => {
    if ('storage' in changed && Number(changed.storage) === FILE_STORAGE.S3) {
      const currentConfig = (form.getFieldValue('config') ?? {}) as Record<string, unknown>
      form.setFieldsValue({
        config: {
          ...currentConfig,
          region: currentConfig.region ?? 'us-east-1',
          enablePathStyleAccess: currentConfig.enablePathStyleAccess ?? true,
          enablePublicAccess: currentConfig.enablePublicAccess ?? true,
        },
      })
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const storage = parseInt(String(values.storage), 10) as FileStorageValue
    const allowedFields = STORAGE_CONFIG_FIELDS[storage]
    const rawConfig = (values.config ?? {}) as Record<string, unknown>
    const cleanConfig: Record<string, unknown> = {}

    for (const key of allowedFields) {
      const val = rawConfig[key]
      if (val !== undefined) {
        cleanConfig[key] = val
      }
    }

    const payload: FileConfigSaveReqDTO = {
      name: values.name.trim(),
      storage,
      config: cleanConfig,
      remark: values.remark?.trim() || undefined,
    }

    if (isEdit) {
      await update.mutateAsync({ ...payload, id: configId })
    } else {
      await create.mutateAsync(payload)
    }

    onClose()
  }

  const handleCancel = () => {
    if (!form.isFieldsTouched()) {
      onClose()
      return
    }
    appModal.confirm({
      title: t('infraFileConfig.modal.discardChanges'),
      okText: t('infraFileConfig.modal.discardConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => onClose(),
    })
  }

  const showLoading = isEdit && isDetailLoading

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'infraFileConfig.modal.editTitle' : 'infraFileConfig.modal.createTitle')}
      width={640}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={isSubmitting}
      onOk={handleSubmit}
      onCancel={handleCancel}
      destroyOnHidden
      mask={{ closable: false }}
      styles={{
        body: {
          maxHeight: 480,
          overflowY: 'auto',
          padding: 8,
        },
      }}
    >
      {showLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description={t('infraFileConfig.modal.loading')} />
        </div>
      ) : (
        <Form form={form} layout="vertical" autoComplete="off" onValuesChange={handleValuesChange}>
          <Form.Item
            name="name"
            label={t('infraFileConfig.form.name')}
            rules={[
              { required: true, message: t('infraFileConfig.validation.nameRequired') },
              { max: 63, message: t('infraFileConfig.validation.nameMaxLength') },
            ]}
          >
            <Input placeholder={t('infraFileConfig.form.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="storage"
            label={t('infraFileConfig.form.storage')}
            rules={[{ required: true, message: t('infraFileConfig.validation.storageRequired') }]}
          >
            <DictSelect
              dictType={FILE_CONFIG_DICT_TYPES.storage}
              placeholder={t('infraFileConfig.form.storage')}
              disabled={isEdit}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.storage !== curr.storage}>
            {({ getFieldValue }) => {
              const storage = resolveStorageValue(getFieldValue('storage'))
              if (storage == null) return null

              if (storage === FILE_STORAGE.DB) {
                return (
                  <Form.Item
                    name={['config', 'domain']}
                    label={t('infraFileConfig.form.domain')}
                    tooltip={t('infraFileConfig.form.domainHelp')}
                    rules={[
                      { required: true, message: t('infraFileConfig.validation.domainRequired') },
                      { type: 'url', message: t('infraFileConfig.validation.domainInvalidUrl') },
                    ]}
                  >
                    <Input placeholder="https://example.com" />
                  </Form.Item>
                )
              }

              if (storage === FILE_STORAGE.LOCAL) {
                return (
                  <>
                    <Form.Item
                      name={['config', 'basePath']}
                      label={t('infraFileConfig.form.basePath')}
                      rules={[
                        {
                          required: true,
                          message: t('infraFileConfig.validation.basePathRequired'),
                        },
                      ]}
                    >
                      <Input placeholder={t('infraFileConfig.form.basePathPlaceholder')} />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'domain']}
                      label={t('infraFileConfig.form.domain')}
                      tooltip={t('infraFileConfig.form.domainHelp')}
                      rules={[
                        { required: true, message: t('infraFileConfig.validation.domainRequired') },
                        { type: 'url', message: t('infraFileConfig.validation.domainInvalidUrl') },
                      ]}
                    >
                      <Input placeholder="https://example.com" />
                    </Form.Item>
                  </>
                )
              }

              if (storage === FILE_STORAGE.S3) {
                return (
                  <>
                    <Form.Item
                      name={['config', 'endpoint']}
                      label={t('infraFileConfig.form.endpoint')}
                      rules={[
                        {
                          required: true,
                          message: t('infraFileConfig.validation.endpointRequired'),
                        },
                      ]}
                    >
                      <Input placeholder={t('infraFileConfig.form.endpointPlaceholder')} />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'bucket']}
                      label={t('infraFileConfig.form.bucket')}
                      rules={[
                        { required: true, message: t('infraFileConfig.validation.bucketRequired') },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'accessKey']}
                      label={t('infraFileConfig.form.accessKey')}
                      rules={[
                        {
                          required: true,
                          message: t('infraFileConfig.validation.accessKeyRequired'),
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'accessSecret']}
                      label={t('infraFileConfig.form.accessSecret')}
                      rules={[
                        {
                          required: true,
                          message: t('infraFileConfig.validation.accessSecretRequired'),
                        },
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'enablePathStyleAccess']}
                      label={t('infraFileConfig.form.enablePathStyleAccess')}
                      rules={[
                        {
                          required: true,
                          message: t('infraFileConfig.validation.pathStyleRequired'),
                        },
                      ]}
                    >
                      <Radio.Group>
                        <Radio value={true}>{t('infraFileConfig.form.enabledOption')}</Radio>
                        <Radio value={false}>{t('infraFileConfig.form.disabledOption')}</Radio>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item
                      name={['config', 'enablePublicAccess']}
                      label={t('infraFileConfig.form.enablePublicAccess')}
                      rules={[
                        {
                          required: true,
                          message: t('infraFileConfig.validation.publicAccessRequired'),
                        },
                      ]}
                    >
                      <Radio.Group>
                        <Radio value={true}>{t('infraFileConfig.form.publicLabel')}</Radio>
                        <Radio value={false}>{t('infraFileConfig.form.privateLabel')}</Radio>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item name={['config', 'region']} label={t('infraFileConfig.form.region')}>
                      <Input placeholder={t('infraFileConfig.form.regionPlaceholder')} />
                    </Form.Item>
                    <Form.Item
                      name={['config', 'domain']}
                      label={t('infraFileConfig.form.domain')}
                      rules={[
                        { type: 'url', message: t('infraFileConfig.validation.domainInvalidUrl') },
                      ]}
                    >
                      <Input placeholder="https://example.com" />
                    </Form.Item>
                  </>
                )
              }

              return null
            }}
          </Form.Item>

          <Form.Item name="remark" label={t('infraFileConfig.form.remark')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
