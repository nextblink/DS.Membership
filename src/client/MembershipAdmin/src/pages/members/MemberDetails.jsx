import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

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
  const { t } = useTranslation(['members', 'enums', 'common'])
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [forms, setForms] = useState([])
  const [formsLoaded, setFormsLoaded] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    if (!window.confirm(t('members:detail.deleteConfirm'))) return
    setDeleting(true)
    try {
      await api.delete(`/api/members/${id}`)
      navigate('/members')
    } catch (err) {
      setError(err?.response?.data?.message || t('members:error.deleteFailed'))
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
        <p className="text-sm text-red-600">{error || t('members:error.notFound')}</p>
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
  const orgUnitName = member.orgUnit?.name ?? member.orgUnitName ?? ''
  const fns = member.memberFunctions ?? member.functions ?? []
  const phones = member.phones ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{fullName}</h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">JMBG {member.jmbg}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/members')}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('members:detail.back')}
          </button>
          <button
            onClick={() => navigate(`/members/${id}/edit`)}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
          >
            {t('members:detail.edit')}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-error-500 hover:bg-error-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
          >
            {deleting ? t('members:detail.deleting') : t('members:detail.delete')}
          </button>
        </div>
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.personal')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.firstName')}>{member.firstName}</Field>
          <Field label={t('members:form.lastName')}>{member.lastName}</Field>
          <Field label={t('members:form.parentName')}>{member.parentName}</Field>
          <Field label={t('members:form.dateOfBirth')}>{member.dateOfBirth}</Field>
          <Field label={t('members:form.jmbg')}>{member.jmbg}</Field>
          <Field label={t('members:form.gender')}>
            {member.gender ? t(`enums:gender.${member.gender.toLowerCase()}`) : '—'}
          </Field>
          <Field label={t('members:form.maritalStatus')}>
            {member.maritalStatus ? t(`enums:maritalStatus.${member.maritalStatus.toLowerCase()}`) : '—'}
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.contact')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.postalCode')}>{member.postalCode}</Field>
          <Field label={t('members:form.city')}>{member.city}</Field>
          <Field label={t('members:form.email')}>{member.email}</Field>
        </div>
        <div className="mt-4">
          <div className={labelClass}>{t('members:form.phones')}</div>
          {phones.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">—</p>
          ) : (
            <ul className="mt-1 text-theme-sm text-gray-900 dark:text-white list-disc pl-5">
              {phones.map((p) => (
                <li key={p.id}>
                  {p.number} <span className="text-gray-500 dark:text-gray-400">({t(`enums:phoneType.${p.type.toLowerCase()}`)})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.membership')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.orgUnit')}>{orgUnitName}</Field>
          <Field label={t('members:form.membershipDate')}>{member.membershipDate}</Field>
          <Field label={t('members:form.votingPlaceNumber')}>{member.votingPlaceNumber}</Field>
        </div>
        <div className="mt-4">
          <div className={labelClass}>{t('members:form.functions')}</div>
          {fns.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">—</p>
          ) : (
            <ul className="mt-1 text-theme-sm text-gray-900 dark:text-white list-disc pl-5">
              {fns.map((f) => (
                <li key={f.id}>
                  {f.function?.name ?? f.functionName ?? f.name}
                  {f.assignedDate ? ` — ${t('members:detail.assigned')} ${f.assignedDate}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.employment')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.occupation')}>{member.occupation}</Field>
          <Field label={t('members:form.jobTitle')}>{member.jobTitle}</Field>
          <Field label={t('members:form.companyName')}>{member.companyName}</Field>
          <Field label={t('members:form.companyCity')}>{member.companyCity}</Field>
          <Field label={t('members:form.isPublicCompany')}>{member.isPublicCompany ? t('common:bool.yes') : t('common:bool.no')}</Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.education')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.educationLevel')}>
            {member.educationLevel ? t(`enums:educationLevel.${member.educationLevel.toLowerCase()}`) : '—'}
          </Field>
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
                {f.scanDate ? ` (${t('members:detail.scanned')} ${f.scanDate})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
