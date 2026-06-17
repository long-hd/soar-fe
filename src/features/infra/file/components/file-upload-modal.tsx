import { Icon } from '@iconify/react'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Modal, Upload, type UploadFile, type UploadProps } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fileApi } from '@/features/infra/file/api'
import { fileQueryKey } from '@/features/infra/file/hooks'

interface FileUploadModalProps {
  open: boolean
  onClose: () => void
}

export function FileUploadModal({ open, onClose }: FileUploadModalProps) {
  const { t } = useTranslation()
  const { modal: appModal } = App.useApp()
  const queryClient = useQueryClient()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    if (!open || fileList.length === 0) return
    const allSettled = fileList.every(f => f.status === 'done' || f.status === 'error')
    if (allSettled) {
      void queryClient.invalidateQueries({ queryKey: fileQueryKey })
    }
  }, [fileList, open, queryClient])

  const customRequest: UploadProps['customRequest'] = async ({
    file,
    onProgress,
    onSuccess,
    onError,
  }) => {
    try {
      const url = await fileApi.upload(file as File, undefined, progress => {
        onProgress?.({ percent: (progress.loaded / progress.total) * 100 })
      })
      onSuccess?.(url)
    } catch (err) {
      onError?.(err as Error)
    }
  }

  const handleChange: UploadProps['onChange'] = ({ fileList: nextFileList }) => {
    setFileList(nextFileList)
  }

  const handleClose = () => {
    const inProgress = fileList.some(f => f.status === 'uploading')
    if (!inProgress) {
      setFileList([])
      void queryClient.invalidateQueries({ queryKey: fileQueryKey })
      onClose()
      return
    }
    appModal.confirm({
      title: t('infraFile.upload.cancelInProgress'),
      okText: t('infraFile.upload.cancelConfirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        setFileList([])
        void queryClient.invalidateQueries({ queryKey: fileQueryKey })
        onClose()
      },
    })
  }

  const handleDone = () => {
    setFileList([])
    void queryClient.invalidateQueries({ queryKey: fileQueryKey })
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('infraFile.upload.title')}
      width={640}
      mask={{ closable: false }}
      destroyOnHidden
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="done" type="primary" onClick={handleDone}>
          {t('infraFile.upload.done')}
        </Button>,
      ]}
    >
      <Upload.Dragger
        multiple
        fileList={fileList}
        customRequest={customRequest}
        onChange={handleChange}
        showUploadList={{ showRemoveIcon: true }}
      >
        <p className="ant-upload-drag-icon flex justify-center">
          <Icon icon="mdi:cloud-upload-outline" width={48} />
        </p>
        <p className="ant-upload-text">{t('infraFile.upload.draggerText')}</p>
        <p className="ant-upload-hint">{t('infraFile.upload.draggerHint')}</p>
      </Upload.Dragger>
    </Modal>
  )
}
