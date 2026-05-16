import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import MemberForm from './MemberForm'
import { useToast, ToastContainer } from '../../components/Toast'

export default function MemberEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation(['members', 'common'])
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/api/members/${id}`)
      .then((res) => {
        if (!cancelled) setMember(res.data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.response?.data?.message || t('members:error.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function onSubmit(payload, diff) {
    setSubmitting(true)
    setError(null)
    // Strip nested collections — edit uses nested endpoints for phones/functions.
    const { phones, memberFunctions, ...putPayload } = payload
    try {
      await api.put(`/api/members/${id}`, putPayload)

      // Sequence nested mutations. We don't fail-fast on individual deletes/adds beyond
      // surfacing the first error to the user.
      for (const pid of diff.removedPhoneIds) {
        await api.delete(`/api/members/${id}/phones/${pid}`)
        toast.success(t('members:toast.phoneRemoved'))
      }
      for (const p of diff.addedPhones) {
        await api.post(`/api/members/${id}/phones`, p)
        toast.success(t('members:toast.phoneAdded'))
      }
      for (const fid of diff.removedFunctionIds) {
        await api.delete(`/api/members/${id}/functions/${fid}`)
        toast.success(t('members:toast.functionRemoved'))
      }
      for (const f of diff.addedFunctions) {
        await api.post(`/api/members/${id}/functions`, f)
        toast.success(t('members:toast.functionAdded'))
      }
      toast.success(t('members:toast.saved'))
      navigate(`/members/${id}`)
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setError(t('members:validation.jmbgTaken'))
        toast.error(t('members:validation.jmbgTaken'))
      } else {
        const msg = err?.response?.data?.message || t('members:error.saveChangesFailed')
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-theme-sm text-error-500">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <h1 className="text-2xl font-semibold text-brand-500 dark:text-brand-400 mb-4">
        {t('members:editMember')}
        {member?.firstName ? ` — ${member.firstName} ${member.lastName ?? ''}` : ''}
      </h1>
      <MemberForm
        mode="edit"
        initialMember={member}
        onSubmit={onSubmit}
        onCancel={() => navigate(`/members/${id}`)}
        submitError={error}
        submitting={submitting}
      />
    </div>
  )
}
