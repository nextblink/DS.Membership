// Shared form for MemberCreate + MemberEdit.
//
// Modes:
//   - mode="create" : caller passes onSubmit(payload) which POSTs /api/members.
//                     phones/functions are sent in the create payload.
//   - mode="edit"   : caller passes onSubmit(payload) which PUTs /api/members/{id}.
//                     phones/functions are managed via nested endpoints by the parent
//                     (see MemberEdit). The form still surfaces add/remove UI and
//                     reports the desired final lists via onSubmit's second arg
//                     ({ addedPhones, removedPhoneIds, addedFunctions, removedFunctionIds }).
import { useEffect, useRef, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  PHONE_TYPE_OPTIONS,
} from './enums'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const sectionTitleClass = 'text-base font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-3'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-[11px] text-error-500 mt-0.5'
const gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-4'

function emptyDefaults() {
  return {
    firstName: '',
    lastName: '',
    parentName: '',
    dateOfBirth: '',
    jmbg: '',
    gender: 'Male',
    maritalStatus: 'Single',
    postalCode: '',
    city: '',
    email: '',
    phones: [],
    committeeId: '',
    membershipDate: '',
    votingPlaceNumber: '',
    memberFunctions: [],
    occupation: '',
    jobTitle: '',
    companyName: '',
    companyCity: '',
    isPublicCompany: false,
    educationLevel: 'Secondary',
  }
}

function toFormValues(member) {
  if (!member) return emptyDefaults()
  return {
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    parentName: member.parentName ?? '',
    dateOfBirth: member.dateOfBirth ?? '',
    jmbg: member.jmbg ?? '',
    gender: member.gender ?? 'Male',
    maritalStatus: member.maritalStatus ?? 'Single',
    postalCode: member.postalCode ?? '',
    city: member.city ?? '',
    email: member.email ?? '',
    phones: (member.phones ?? []).map((p) => ({
      id: p.id,
      number: p.number ?? '',
      type: p.type ?? 'Mobile',
    })),
    committeeId: member.committeeId != null ? String(member.committeeId) : '',
    membershipDate: member.membershipDate ?? '',
    votingPlaceNumber:
      member.votingPlaceNumber != null ? String(member.votingPlaceNumber) : '',
    memberFunctions: (member.memberFunctions ?? member.functions ?? []).map((f) => ({
      id: f.id,
      functionId: String(f.functionId ?? f.function?.id ?? ''),
      assignedDate: f.assignedDate ?? '',
    })),
    occupation: member.occupation ?? '',
    jobTitle: member.jobTitle ?? '',
    companyName: member.companyName ?? '',
    companyCity: member.companyCity ?? '',
    isPublicCompany: !!member.isPublicCompany,
    educationLevel: member.educationLevel ?? 'Secondary',
  }
}

function buildPayload(values) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    parentName: values.parentName?.trim() || null,
    dateOfBirth: values.dateOfBirth || null,
    jmbg: values.jmbg.trim(),
    gender: values.gender,
    maritalStatus: values.maritalStatus,
    postalCode: values.postalCode?.trim() || null,
    city: values.city?.trim() || null,
    email: values.email?.trim() || null,
    committeeId: values.committeeId ? Number(values.committeeId) : null,
    membershipDate: values.membershipDate || null,
    votingPlaceNumber:
      values.votingPlaceNumber === '' || values.votingPlaceNumber == null
        ? null
        : Number(values.votingPlaceNumber),
    occupation: values.occupation?.trim() || null,
    jobTitle: values.jobTitle?.trim() || null,
    companyName: values.companyName?.trim() || null,
    companyCity: values.companyCity?.trim() || null,
    isPublicCompany: !!values.isPublicCompany,
    educationLevel: values.educationLevel,
    phones: (values.phones ?? []).map((p) => ({
      number: p.number?.trim() ?? '',
      type: p.type,
    })),
    memberFunctions: (values.memberFunctions ?? []).map((f) => ({
      functionId: Number(f.functionId),
      assignedDate: f.assignedDate || null,
    })),
  }
}

function diffNested(original, current) {
  const origPhones = original?.phones ?? []
  const curPhones = current.phones ?? []
  const addedPhones = curPhones
    .filter((p) => !p.id)
    .map((p) => ({ number: p.number?.trim() ?? '', type: p.type }))
  const curPhoneIds = new Set(curPhones.filter((p) => p.id).map((p) => p.id))
  const removedPhoneIds = origPhones.filter((p) => !curPhoneIds.has(p.id)).map((p) => p.id)

  const origFns = original?.memberFunctions ?? original?.functions ?? []
  const curFns = current.memberFunctions ?? []
  const addedFunctions = curFns
    .filter((f) => !f.id)
    .map((f) => ({
      functionId: Number(f.functionId),
      assignedDate: f.assignedDate || null,
    }))
  const curFnIds = new Set(curFns.filter((f) => f.id).map((f) => f.id))
  const removedFunctionIds = origFns.filter((f) => !curFnIds.has(f.id)).map((f) => f.id)

  return { addedPhones, removedPhoneIds, addedFunctions, removedFunctionIds }
}

export default function MemberForm({
  mode = 'create',
  initialMember = null,
  initialExtracted = null,
  onSubmit,
  onCancel,
  submitError = null,
  submitting = false,
}) {
  const { t } = useTranslation(['members', 'enums', 'common'])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(initialMember) })

  const phones = useFieldArray({ control, name: 'phones' })
  const fns = useFieldArray({ control, name: 'memberFunctions' })

  const [committees, setCommittees] = useState([])
  const [functionsList, setFunctionsList] = useState([])
  const [lookupsLoaded, setLookupsLoaded] = useState(false)
  const [extractedKeys, setExtractedKeys] = useState(new Set())
  const [jmbgWarning, setJmbgWarning] = useState(null)
  const jmbgTimer = useRef(null)

  async function checkJmbgDuplicate(jmbg) {
    if (!jmbg || jmbg.length !== 13) { setJmbgWarning(null); return }
    try {
      const res = await api.get('/api/members', { params: { jmbg, pageSize: 1 } })
      const items = res.data?.items ?? []
      if (items.length > 0) {
        setJmbgWarning({ id: items[0].id, fullName: `${items[0].firstName} ${items[0].lastName}` })
      } else {
        setJmbgWarning(null)
      }
    } catch {
      setJmbgWarning(null)
    }
  }

  useEffect(() => {
    if (!initialExtracted) return
    const e = initialExtracted
    const filled = new Set()
    function markFilled(key, value) {
      if (value != null && value !== '') filled.add(key)
      return value ?? ''
    }
    const phones = (e.phones ?? []).map((p, i) => ({
      id: `ext-${i}`,
      number: p.number ?? '',
      type: p.type ?? 'Mobile',
    }))
    if (phones.length > 0) filled.add('phones')
    const newValues = {
      ...toFormValues(null),
      firstName:         markFilled('firstName', e.firstName),
      lastName:          markFilled('lastName', e.lastName),
      parentName:        markFilled('parentName', e.parentName),
      dateOfBirth:       markFilled('dateOfBirth', e.dateOfBirth),
      jmbg:              markFilled('jmbg', e.jmbg),
      gender:            e.gender ?? 'Male',
      postalCode:        markFilled('postalCode', e.postalCode),
      idCardNumber:      markFilled('idCardNumber', e.idCardNumber),
      city:              markFilled('city', e.city),
      email:             markFilled('email', e.email),
      phones:            phones.length > 0 ? phones : [],
      maritalStatus:     e.maritalStatus ?? 'Single',
      votingPlaceNumber: e.votingPlaceNumber != null ? String(e.votingPlaceNumber) : '',
      educationLevel:    e.educationLevel ?? 'Secondary',
      occupation:        markFilled('occupation', e.occupation),
      jobTitle:          markFilled('jobTitle', e.jobTitle),
      companyName:       markFilled('companyName', e.companyName),
      companyCity:       markFilled('companyCity', e.companyCity),
      membershipDate:    markFilled('membershipDate', e.membershipDate),
    }
    if (e.gender) filled.add('gender')
    if (e.maritalStatus) filled.add('maritalStatus')
    if (e.educationLevel) filled.add('educationLevel')
    if (e.votingPlaceNumber != null) filled.add('votingPlaceNumber')
    reset(newValues)
    setExtractedKeys(filled)
    if (e.jmbg) checkJmbgDuplicate(e.jmbg)
  }, [initialExtracted, reset])

  // Reset only after lookups load so select options exist when values like orgUnitId='1' are set.
  // Skip if we came from extraction — the extraction useEffect already called reset with pre-filled values.
  useEffect(() => {
    if (lookupsLoaded && !initialExtracted) {
      reset(toFormValues(initialMember))
    }
  }, [initialMember, initialExtracted, lookupsLoaded, reset])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [orgRes, fnRes] = await Promise.all([
          api.get('/api/committees'),
          api.get('/api/functions'),
        ])
        if (cancelled) return
        setCommittees(flattenOrgUnits(orgRes.data))
        setFunctionsList(Array.isArray(fnRes.data) ? fnRes.data : fnRes.data?.items ?? [])
      } catch {
        // leave dropdowns empty; field-level validation still applies
      } finally {
        if (!cancelled) setLookupsLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const submit = handleSubmit((values) => {
    const payload = buildPayload(values)
    if (mode === 'edit') {
      const diff = diffNested(initialMember, values)
      onSubmit(payload, diff)
    } else {
      onSubmit(payload)
    }
  })

  return (
    <form onSubmit={submit} className="max-w-5xl">
      {submitError && (
        <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {submitError}
        </div>
      )}

      {/* Personal + Contact */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.personal')} / {t('members:form.contact')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Field label={t('members:form.firstName')} required error={errors.firstName?.message}>
            <input
              className={`${inputClass}${extractedKeys.has('firstName') ? ' extracted-field' : ''}`}
              {...register('firstName', {
                required: t('members:validation.firstNameRequired'),
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('firstName'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.lastName')} required error={errors.lastName?.message}>
            <input
              className={`${inputClass}${extractedKeys.has('lastName') ? ' extracted-field' : ''}`}
              {...register('lastName', {
                required: t('members:validation.lastNameRequired'),
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('lastName'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.parentName')} error={errors.parentName?.message}>
            <input
              className={`${inputClass}${extractedKeys.has('parentName') ? ' extracted-field' : ''}`}
              {...register('parentName', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('parentName'); return s }),
              })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label={t('members:form.dateOfBirth')} required error={errors.dateOfBirth?.message}>
            <input
              type="date"
              className={`${inputClass}${extractedKeys.has('dateOfBirth') ? ' extracted-field' : ''}`}
              {...register('dateOfBirth', {
                required: t('members:validation.dateOfBirthRequired'),
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('dateOfBirth'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.jmbg')} required error={errors.jmbg?.message}>
            <input
              className={`${inputClass}${extractedKeys.has('jmbg') ? ' extracted-field' : ''}`}
              inputMode="numeric"
              pattern="[0-9]*"
              {...register('jmbg', {
                required: t('members:validation.jmbgRequired'),
                minLength: { value: 13, message: t('members:validation.jmbgLength') },
                maxLength: { value: 13, message: t('members:validation.jmbgLength') },
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13)
                  setExtractedKeys((prev) => { const s = new Set(prev); s.delete('jmbg'); return s })
                  clearTimeout(jmbgTimer.current)
                  jmbgTimer.current = setTimeout(() => checkJmbgDuplicate(e.target.value), 400)
                },
              })}
              onBlur={() => checkJmbgDuplicate(watch('jmbg'))}
            />
          </Field>
          <div className="col-span-2 flex gap-4">
            <Field label={t('members:form.gender')} required error={errors.gender?.message}>
              <div className={`flex gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit${extractedKeys.has('gender') ? ' extracted-field' : ''}`}>
                {GENDER_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      setValue('gender', o.value)
                      setExtractedKeys((prev) => { const s = new Set(prev); s.delete('gender'); return s })
                    }}
                    className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                      watch('gender') === o.value
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t(`enums:gender.${o.value.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('members:form.maritalStatus')} required error={errors.maritalStatus?.message}>
              <div className={`flex flex-wrap gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit${extractedKeys.has('maritalStatus') ? ' extracted-field' : ''}`}>
                {MARITAL_STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      setValue('maritalStatus', o.value)
                      setExtractedKeys((prev) => { const s = new Set(prev); s.delete('maritalStatus'); return s })
                    }}
                    className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                      watch('maritalStatus') === o.value
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t(`enums:maritalStatus.${o.value.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <Field label={t('members:form.city')}>
            <input
              className={`${inputClass}${extractedKeys.has('city') ? ' extracted-field' : ''}`}
              {...register('city', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('city'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.postalCode')}>
            <input
              className={`${inputClass}${extractedKeys.has('postalCode') ? ' extracted-field' : ''}`}
              {...register('postalCode', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('postalCode'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.votingPlaceNumber')}>
            <input
              className={`${inputClass}${extractedKeys.has('votingPlaceNumber') ? ' extracted-field' : ''}`}
              inputMode="numeric"
              pattern="[0-9]*"
              {...register('votingPlaceNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/\D/g, '')
                  setExtractedKeys((prev) => { const s = new Set(prev); s.delete('votingPlaceNumber'); return s })
                },
              })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-3">
          <Field label={t('members:form.email')} error={errors.email?.message}>
            <input
              type="email"
              className={`${inputClass}${extractedKeys.has('email') ? ' extracted-field' : ''}`}
              {...register('email', {
                pattern: {
                  value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                  message: t('members:validation.emailInvalid'),
                },
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('email'); return s }),
              })}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <label className={labelClass}>{t('members:form.phones')}</label>
            <button
              type="button"
              onClick={() => phones.append({ number: '', type: 'Mobile' })}
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-2.5 py-1 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16m8-8H4"/>
              </svg>
              {t('members:form.addPhone')}
            </button>
          </div>
          {phones.fields.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('members:form.noPhones')}</p>
          )}
          <div className="flex flex-wrap gap-3">
          {phones.fields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 items-center">
              <input
                className={`${inputClass.replace('w-full', '')} w-1/3`}
                placeholder={t('members:form.phoneNumber')}
                inputMode="tel"
                {...register(`phones.${idx}.number`, { required: t('members:validation.phoneRequired') })}
              />
              <div className="flex gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5">
                {PHONE_TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue(`phones.${idx}.type`, o.value)}
                    className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                      watch(`phones.${idx}.type`) === o.value
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t(`enums:phoneType.${o.value.toLowerCase()}`)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-error-200 dark:border-error-700 px-2.5 py-1 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10"
                onClick={() => phones.remove(idx)}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
                {t('members:form.removePhone')}
              </button>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* Membership */}

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.membership')}</h2>
        <div className="grid grid-cols-4 gap-4">
          <Field label={t('members:form.committee')} required error={errors.committeeId?.message}>
            <select
              className={inputClass}
              {...register('committeeId', { required: t('members:validation.committeeRequired') })}
            >
              <option value="">{lookupsLoaded ? t('members:form.selectCommittee') : t('members:form.loadingCommittee')}</option>
              {committees.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('members:form.membershipDate')} required error={errors.membershipDate?.message}>
            <input
              type="date"
              className={`${inputClass}${extractedKeys.has('membershipDate') ? ' extracted-field' : ''}`}
              {...register('membershipDate', {
                required: t('members:validation.membershipDateRequired'),
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('membershipDate'); return s }),
              })}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <label className={labelClass}>{t('members:form.functions')}</label>
            <button
              type="button"
              onClick={() => fns.append({ functionId: functionsList[0] ? String(functionsList[0].id) : '', assignedDate: '' })}
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-2.5 py-1 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16m8-8H4"/>
              </svg>
              {t('members:form.addFunction')}
            </button>
          </div>
          {fns.fields.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('members:form.noFunctions')}</p>
          )}
          {fns.fields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 mb-2 items-center">
              <select
                className={`${inputClass.replace('w-full', '')} w-1/6`}
                {...register(`memberFunctions.${idx}.functionId`, { required: true })}
              >
                <option value="">{t('members:form.selectFunction')}</option>
                {functionsList.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className={`${inputClass.replace('w-full', '')} w-1/6`}
                {...register(`memberFunctions.${idx}.assignedDate`, { required: true })}
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-error-200 dark:border-error-700 px-2.5 py-1 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10"
                onClick={() => fns.remove(idx)}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
                {t('members:form.removeFunction')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Employment */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.employment')} / {t('members:form.education')}</h2>

        {/* Row 1: Occupation + Education Level */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Field label={t('members:form.occupation')}>
            <input
              className={`${inputClass}${extractedKeys.has('occupation') ? ' extracted-field' : ''}`}
              {...register('occupation', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('occupation'); return s }),
              })}
            />
          </Field>
          <div className="col-span-3">
          <Field label={t('members:form.educationLevel')} required>
            <div className={`flex flex-wrap gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit${extractedKeys.has('educationLevel') ? ' extracted-field' : ''}`}>
              {EDUCATION_LEVEL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setValue('educationLevel', o.value)
                    setExtractedKeys((prev) => { const s = new Set(prev); s.delete('educationLevel'); return s })
                  }}
                  className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                    watch('educationLevel') === o.value
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(`enums:educationLevel.${o.value.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </Field>
          </div>
        </div>

        {/* Row 2: Job Title + Company Name + Company City + Is Public */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <Field label={t('members:form.jobTitle')}>
            <input
              className={`${inputClass}${extractedKeys.has('jobTitle') ? ' extracted-field' : ''}`}
              {...register('jobTitle', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('jobTitle'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.companyName')}>
            <input
              className={`${inputClass}${extractedKeys.has('companyName') ? ' extracted-field' : ''}`}
              {...register('companyName', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('companyName'); return s }),
              })}
            />
          </Field>
          <Field label={t('members:form.companyCity')}>
            <input
              className={`${inputClass}${extractedKeys.has('companyCity') ? ' extracted-field' : ''}`}
              {...register('companyCity', {
                onChange: () => setExtractedKeys((prev) => { const s = new Set(prev); s.delete('companyCity'); return s }),
              })}
            />
          </Field>
          <div>
            <label className={labelClass}>{t('members:form.isPublicCompany')}</label>
            <div className="flex gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit">
              {[{ value: false, label: t('common:bool.no') }, { value: true, label: t('common:bool.yes') }].map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => setValue('isPublicCompany', o.value)}
                  className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                    watch('isPublicCompany') === o.value
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {jmbgWarning && (
        <div className="mb-4 rounded-lg border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 px-4 py-3 text-theme-sm text-yellow-700 dark:text-yellow-300 flex items-center justify-between">
          <span>{t('members:validation.jmbgExists', { name: jmbgWarning.fullName })}</span>
          <a
            href={`/members/${jmbgWarning.id}`}
            target="_blank"
            rel="noreferrer"
            className="ml-4 underline font-medium shrink-0"
          >
            {t('members:validation.viewMember')}
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('members:submit.saving') : mode === 'create' ? t('members:submit.create') : t('members:submit.save')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-error-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}

// /api/committees returns a tree; flatten to a labeled list for selects.
function flattenOrgUnits(data) {
  const out = []
  const list = Array.isArray(data) ? data : data?.items ?? []
  function walk(nodes, depth) {
    for (const n of nodes) {
      out.push({ id: n.id, label: `${'— '.repeat(depth)}${n.name}` })
      if (n.children && n.children.length) walk(n.children, depth + 1)
    }
  }
  walk(list, 0)
  return out
}
