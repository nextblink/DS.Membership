import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { formatDate } from '../../services/dateUtils'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmModal'

const labelClass = 'text-theme-xs uppercase font-medium text-gray-500 dark:text-gray-400'
const valueClass = 'text-theme-sm text-gray-900 dark:text-white mt-0.5'
const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const sectionTitleClass = 'text-base font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-3'
const gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'

function Field({ label, children }) {
  return (
    <div>
      <div className={labelClass}>{label}</div>
      <div className={valueClass}>{children ?? '—'}</div>
    </div>
  )
}

export default function MemberDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state: routeState } = useLocation()
  const { t } = useTranslation(['members', 'enums', 'common'])
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [forms, setForms] = useState([])
  const [formsLoaded, setFormsLoaded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    if (routeState?.toast === 'saved') toast.success(t('members:toast.saved'))
    if (routeState?.toast === 'created') toast.success(t('members:toast.created'))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/api/members/${id}`)
      .then((res) => {
        if (cancelled) return
        setMember(res.data)
        // Try to read forms from the response first.
        if (Array.isArray(res.data?.forms)) {
          setForms(res.data.forms)
          setFormsLoaded(true)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || t('members:error.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // If the member response didn't include forms, fall back to /api/forms?memberId=...
  // If that endpoint is unavailable, silently leave the list empty.
  useEffect(() => {
    if (formsLoaded || !member) return
    let cancelled = false
    api
      .get('/api/forms', { params: { memberId: id, pageSize: 100 } })
      .then((res) => {
        if (cancelled) return
        const items = res.data?.items ?? (Array.isArray(res.data) ? res.data : [])
        setForms(items)
        setFormsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setFormsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [member, formsLoaded, id])

  async function handleDelete() {
    const ok = await confirm({ title: t('members:detail.delete'), message: t('members:detail.deleteConfirm') })
    if (!ok) return
    setDeleting(true)
    try {
      await api.delete(`/api/members/${id}`)
      toast.success(t('members:toast.deleted'))
      navigate('/members')
    } catch (err) {
      const msg = err?.response?.data?.message || t('members:error.deleteFailed')
      setError(msg)
      toast.error(msg)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>
      </div>
    )
  }
  if (error || !member) {
    return (
      <div className="p-6">
        <p className="text-theme-sm text-error-500">{error || t('members:error.notFound')}</p>
        <button
          onClick={() => navigate('/members')}
          className="mt-3 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('members:detail.backToMembers')}
        </button>
      </div>
    )
  }

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ')
  const committeeName = member.committee?.name ?? member.committeeName ?? ''
  const fns = member.memberFunctions ?? member.functions ?? []
  const phones = member.phones ?? []

  return (
    <div className="p-6">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <ConfirmDialog />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-brand-500 dark:text-brand-400">
            {fullName}
            {committeeName && <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal">— {committeeName}</span>}
          </h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">JMBG {member.jmbg}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/members/${id}/edit`)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {t('members:detail.edit')}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-md border border-error-200 dark:border-error-700 px-3 py-1.5 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            {deleting ? t('members:detail.deleting') : t('members:detail.delete')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left column: Personal/Contact + Employment/Education */}
        <div>
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>{t('members:form.personal')} / {t('members:form.contact')}</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Field label={t('members:form.firstName')}>{member.firstName}</Field>
              <Field label={t('members:form.lastName')}>{member.lastName}</Field>
              <Field label={t('members:form.parentName')}>{member.parentName}</Field>
              <div />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Field label={t('members:form.dateOfBirth')}>{formatDate(member.dateOfBirth)}</Field>
              <Field label={t('members:form.jmbg')}>{member.jmbg}</Field>
              <Field label={t('members:form.gender')}>
                {member.gender ? t(`enums:gender.${member.gender.toLowerCase()}`) : '—'}
              </Field>
              <Field label={t('members:form.maritalStatus')}>
                {member.maritalStatus ? t(`enums:maritalStatus.${member.maritalStatus.toLowerCase()}`) : '—'}
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-3">
              <Field label={t('members:form.city')}>{member.city}</Field>
              <Field label={t('members:form.postalCode')}>{member.postalCode}</Field>
              <Field label={t('members:form.votingPlaceNumber')}>{member.votingPlaceNumber}</Field>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Field label={t('members:form.email')}>{member.email}</Field>
            </div>
            <div className="mt-2">
              <div className={labelClass}>{t('members:form.phones')}</div>
              {phones.length === 0 ? (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400 mt-1">—</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-4">
                  {phones.map((p) => (
                    <span key={p.id} className="text-theme-sm text-gray-900 dark:text-white">
                      {p.number}
                      <span className="ml-1 text-theme-xs text-gray-500 dark:text-gray-400">({t(`enums:phoneType.${p.type.toLowerCase()}`)})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>{t('members:form.employment')} / {t('members:form.education')}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label={t('members:form.occupation')}>{member.occupation}</Field>
              <Field label={t('members:form.educationLevel')}>
                {member.educationLevel ? t(`enums:educationLevel.${member.educationLevel.toLowerCase()}`) : '—'}
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Field label={t('members:form.jobTitle')}>{member.jobTitle}</Field>
              <Field label={t('members:form.companyName')}>{member.companyName}</Field>
              <Field label={t('members:form.companyCity')}>{member.companyCity}</Field>
              <Field label={t('members:form.isPublicCompany')}>{member.isPublicCompany ? t('common:bool.yes') : t('common:bool.no')}</Field>
            </div>
          </section>
        </div>

        {/* Right column: Membership + Linked Forms */}
        <div>
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>{t('members:form.membership')}</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Field label={t('members:form.committee')}>{committeeName}</Field>
              <Field label={t('members:form.membershipDate')}>{formatDate(member.membershipDate)}</Field>
            </div>
            <div className="mt-2">
              <div className={labelClass}>{t('members:form.functions')}</div>
              {fns.length === 0 ? (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400 mt-1">—</p>
              ) : (
                <ul className="mt-1 text-theme-sm text-gray-900 dark:text-white space-y-0.5">
                  {fns.map((f) => (
                    <li key={f.id} className="flex items-center gap-2">
                      <span>{f.function?.name ?? f.functionName ?? f.name}</span>
                      {f.assignedDate && <span className="text-theme-xs text-gray-500 dark:text-gray-400">— {t('members:detail.assigned')} {formatDate(f.assignedDate)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>{t('members:form.linkedForms')}</h2>
            {!formsLoaded ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>
            ) : forms.length === 0 ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('members:detail.noLinkedForms')}</p>
            ) : (
              <ul className="text-theme-sm text-gray-900 dark:text-white list-disc pl-5">
                {forms.map((f) => (
                  <li key={f.id}>
                    <Link to={`/forms/${f.id}`} className="text-brand-500 hover:underline">
                      {f.formNumber || `Form #${f.id}`}
                    </Link>
                    {f.status ? ` — ${t(`enums:formStatus.${f.status.toLowerCase()}`)}` : ''}
                    {f.scanDate ? ` (${t('members:detail.scanned')} ${formatDate(f.scanDate)})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

      </div>
    </div>
  )
}
