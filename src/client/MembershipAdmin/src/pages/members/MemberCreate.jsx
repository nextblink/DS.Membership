// src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'
import MemberForm from './MemberForm'

export default function MemberCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation(['members', 'common'])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  // Data arriving from FormUpload.jsx after AI extraction
  const extracted = location.state?.extracted ?? null
  const scannedFiles = location.state?.files ?? null  // File[] from the upload

  async function onSubmit(payload) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post('/api/members', payload)
      const newId = res?.data?.id

      // Silently create the Form audit record if we came from scanning
      if (newId && scannedFiles?.length) {
        try {
          const fd = new FormData()
          if (extracted?.formNumber) fd.append('formNumber', extracted.formNumber)
          if (extracted?.formDate) fd.append('formDate', extracted.formDate)
          if (extracted?.committeeName) fd.append('municipalBoard', extracted.committeeName)
          fd.append('memberId', String(newId))
          scannedFiles.forEach((f) => fd.append('files', f, f.name))
          await api.post('/api/forms', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (formErr) {
          // Non-blocking — member was saved, Form record failure is logged
          console.error('Form audit record creation failed:', formErr)
        }
      }

      if (newId) navigate(`/members/${newId}`, { state: { toast: 'created' } })
      else navigate('/members')
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setError(t('members:validation.jmbgTaken'))
        toast.error(t('members:validation.jmbgTaken'))
      } else {
        const msg = err?.response?.data?.message || t('members:error.saveFailed')
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <h1 className="text-2xl font-semibold text-brand-500 dark:text-brand-400 mb-4">
        {t('members:newMember')}
      </h1>
      <MemberForm
        mode="create"
        initialExtracted={extracted}
        onSubmit={onSubmit}
        onCancel={() => navigate('/members')}
        submitError={error}
        submitting={submitting}
      />
    </div>
  )
}
