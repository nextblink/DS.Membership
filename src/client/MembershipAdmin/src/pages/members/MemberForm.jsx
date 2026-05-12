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
import { useEffect, useState } from 'react'
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
const labelClass = 'block text-theme-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-theme-xs text-error-500 mt-1'
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
    orgUnitId: '',
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
    orgUnitId: member.orgUnitId != null ? String(member.orgUnitId) : '',
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
    orgUnitId: values.orgUnitId ? Number(values.orgUnitId) : null,
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
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(initialMember) })

  const phones = useFieldArray({ control, name: 'phones' })
  const fns = useFieldArray({ control, name: 'memberFunctions' })

  const [orgUnits, setOrgUnits] = useState([])
  const [functionsList, setFunctionsList] = useState([])
  const [lookupsLoaded, setLookupsLoaded] = useState(false)

  // Reset only after lookups load so select options exist when values like orgUnitId='1' are set.
  // Without this guard, the select has no matching option and the browser clears the value to ''.
  useEffect(() => {
    if (lookupsLoaded) {
      reset(toFormValues(initialMember))
    }
  }, [initialMember, lookupsLoaded, reset])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [orgRes, fnRes] = await Promise.all([
          api.get('/api/orgunits'),
          api.get('/api/functions'),
        ])
        if (cancelled) return
        setOrgUnits(flattenOrgUnits(orgRes.data))
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

      {/* Personal */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.personal')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.firstName')} required error={errors.firstName?.message}>
            <input
              className={inputClass}
              {...register('firstName', { required: t('members:validation.firstNameRequired') })}
            />
          </Field>
          <Field label={t('members:form.lastName')} required error={errors.lastName?.message}>
            <input
              className={inputClass}
              {...register('lastName', { required: t('members:validation.lastNameRequired') })}
            />
          </Field>
          <Field label={t('members:form.parentName')} error={errors.parentName?.message}>
            <input className={inputClass} {...register('parentName')} />
          </Field>
          <Field label={t('members:form.dateOfBirth')} required error={errors.dateOfBirth?.message}>
            <input
              type="date"
              className={inputClass}
              {...register('dateOfBirth', { required: t('members:validation.dateOfBirthRequired') })}
            />
          </Field>
          <Field label={t('members:form.jmbg')} required error={errors.jmbg?.message}>
            <input
              className={inputClass}
              {...register('jmbg', {
                required: t('members:validation.jmbgRequired'),
                minLength: { value: 13, message: t('members:validation.jmbgLength') },
                maxLength: { value: 13, message: t('members:validation.jmbgLength') },
              })}
            />
          </Field>
          <Field label={t('members:form.gender')} required error={errors.gender?.message}>
            <select className={inputClass} {...register('gender', { required: true })}>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(`enums:gender.${o.value.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('members:form.maritalStatus')} required error={errors.maritalStatus?.message}>
            <select
              className={inputClass}
              {...register('maritalStatus', { required: true })}
            >
              {MARITAL_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(`enums:maritalStatus.${o.value.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Contact */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.contact')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.postalCode')}>
            <input className={inputClass} {...register('postalCode')} />
          </Field>
          <Field label={t('members:form.city')}>
            <input className={inputClass} {...register('city')} />
          </Field>
          <Field label={t('members:form.email')} error={errors.email?.message}>
            <input
              type="email"
              className={inputClass}
              {...register('email', {
                pattern: {
                  value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                  message: t('members:validation.emailInvalid'),
                },
              })}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>{t('members:form.phones')}</label>
            <button
              type="button"
              className="text-theme-sm text-brand-500 hover:underline"
              onClick={() => phones.append({ number: '', type: 'Mobile' })}
            >
              {t('members:form.addPhone')}
            </button>
          </div>
          {phones.fields.length === 0 && (
            <p className="text-xs text-body">{t('members:form.noPhones')}</p>
          )}
          {phones.fields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 mb-2 items-start">
              <input
                className={`${inputClass} flex-1`}
                placeholder={t('members:form.phoneNumber')}
                {...register(`phones.${idx}.number`, { required: t('members:validation.phoneRequired') })}
              />
              <select
                className={`${inputClass} w-40`}
                {...register(`phones.${idx}.type`, { required: true })}
              >
                {PHONE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(`enums:phoneType.${o.value.toLowerCase()}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="px-3 py-2 text-theme-sm text-error-500 hover:underline"
                onClick={() => phones.remove(idx)}
              >
                {t('members:form.removePhone')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.membership')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.orgUnit')} required error={errors.orgUnitId?.message}>
            <select
              className={inputClass}
              {...register('orgUnitId', { required: t('members:validation.orgUnitRequired') })}
            >
              <option value="">{lookupsLoaded ? t('members:form.selectOrgUnit') : t('members:form.loadingOrgUnit')}</option>
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('members:form.membershipDate')} required error={errors.membershipDate?.message}>
            <input
              type="date"
              className={inputClass}
              {...register('membershipDate', { required: t('members:validation.membershipDateRequired') })}
            />
          </Field>
          <Field label={t('members:form.votingPlaceNumber')}>
            <input
              type="number"
              className={inputClass}
              {...register('votingPlaceNumber')}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>{t('members:form.functions')}</label>
            <button
              type="button"
              className="text-theme-sm text-brand-500 hover:underline"
              onClick={() =>
                fns.append({
                  functionId: functionsList[0] ? String(functionsList[0].id) : '',
                  assignedDate: '',
                })
              }
            >
              {t('members:form.addFunction')}
            </button>
          </div>
          {fns.fields.length === 0 && (
            <p className="text-xs text-body">{t('members:form.noFunctions')}</p>
          )}
          {fns.fields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 mb-2 items-start">
              <select
                className={`${inputClass} flex-1`}
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
                className={`${inputClass} w-48`}
                {...register(`memberFunctions.${idx}.assignedDate`, { required: true })}
              />
              <button
                type="button"
                className="px-3 py-2 text-theme-sm text-error-500 hover:underline"
                onClick={() => fns.remove(idx)}
              >
                {t('members:form.removeFunction')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Employment */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.employment')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.occupation')}>
            <input className={inputClass} {...register('occupation')} />
          </Field>
          <Field label={t('members:form.jobTitle')}>
            <input className={inputClass} {...register('jobTitle')} />
          </Field>
          <Field label={t('members:form.companyName')}>
            <input className={inputClass} {...register('companyName')} />
          </Field>
          <Field label={t('members:form.companyCity')}>
            <input className={inputClass} {...register('companyCity')} />
          </Field>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" {...register('isPublicCompany')} />
            <span className="text-theme-sm text-gray-900 dark:text-white">{t('members:form.isPublicCompany')}</span>
          </label>
        </div>
      </section>

      {/* Education */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t('members:form.education')}</h2>
        <div className={gridClass}>
          <Field label={t('members:form.educationLevel')} required>
            <select className={inputClass} {...register('educationLevel', { required: true })}>
              {EDUCATION_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(`enums:educationLevel.${o.value.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

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

// /api/orgunits returns a tree; flatten to a labeled list for selects.
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
