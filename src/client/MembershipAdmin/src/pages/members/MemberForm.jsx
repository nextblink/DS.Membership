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
import api from '../../framework/api'
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  PHONE_TYPE_OPTIONS,
} from './enums'

const sectionClass = 'rounded border border-stroke bg-white p-5 shadow-sm mb-6'
const sectionTitleClass = 'text-lg font-semibold text-black mb-4 border-b border-stroke pb-2'
const labelClass = 'block text-sm font-medium text-black mb-1'
const inputClass =
  'w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black focus:border-primary focus:outline-none'
const errorClass = 'text-xs text-red-600 mt-1'
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

  useEffect(() => {
    reset(toFormValues(initialMember))
  }, [initialMember, reset])

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
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Personal */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Personal</h2>
        <div className={gridClass}>
          <Field label="First Name" required error={errors.firstName?.message}>
            <input
              className={inputClass}
              {...register('firstName', { required: 'First name is required' })}
            />
          </Field>
          <Field label="Last Name" required error={errors.lastName?.message}>
            <input
              className={inputClass}
              {...register('lastName', { required: 'Last name is required' })}
            />
          </Field>
          <Field label="Parent Name" error={errors.parentName?.message}>
            <input className={inputClass} {...register('parentName')} />
          </Field>
          <Field label="Date of Birth" required error={errors.dateOfBirth?.message}>
            <input
              type="date"
              className={inputClass}
              {...register('dateOfBirth', { required: 'Date of birth is required' })}
            />
          </Field>
          <Field label="JMBG" required error={errors.jmbg?.message}>
            <input
              className={inputClass}
              {...register('jmbg', {
                required: 'JMBG is required',
                minLength: { value: 13, message: 'JMBG must be 13 digits' },
                maxLength: { value: 13, message: 'JMBG must be 13 digits' },
              })}
            />
          </Field>
          <Field label="Gender" required error={errors.gender?.message}>
            <select className={inputClass} {...register('gender', { required: true })}>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marital Status" required error={errors.maritalStatus?.message}>
            <select
              className={inputClass}
              {...register('maritalStatus', { required: true })}
            >
              {MARITAL_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Contact */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Contact</h2>
        <div className={gridClass}>
          <Field label="Postal Code">
            <input className={inputClass} {...register('postalCode')} />
          </Field>
          <Field label="City">
            <input className={inputClass} {...register('city')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              className={inputClass}
              {...register('email', {
                pattern: {
                  value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                  message: 'Invalid email',
                },
              })}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Phones</label>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => phones.append({ number: '', type: 'Mobile' })}
            >
              + Add Phone
            </button>
          </div>
          {phones.fields.length === 0 && (
            <p className="text-xs text-body">No phones added.</p>
          )}
          {phones.fields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 mb-2 items-start">
              <input
                className={`${inputClass} flex-1`}
                placeholder="Number"
                {...register(`phones.${idx}.number`, { required: 'Required' })}
              />
              <select
                className={`${inputClass} w-40`}
                {...register(`phones.${idx}.type`, { required: true })}
              >
                {PHONE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="px-3 py-2 text-sm text-red-600 hover:underline"
                onClick={() => phones.remove(idx)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Membership</h2>
        <div className={gridClass}>
          <Field label="Org Unit" required error={errors.orgUnitId?.message}>
            <select
              className={inputClass}
              {...register('orgUnitId', { required: 'Org Unit is required' })}
            >
              <option value="">{lookupsLoaded ? '-- Select --' : 'Loading...'}</option>
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Membership Date" required error={errors.membershipDate?.message}>
            <input
              type="date"
              className={inputClass}
              {...register('membershipDate', { required: 'Membership date is required' })}
            />
          </Field>
          <Field label="Voting Place Number">
            <input
              type="number"
              className={inputClass}
              {...register('votingPlaceNumber')}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Functions</label>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() =>
                fns.append({
                  functionId: functionsList[0] ? String(functionsList[0].id) : '',
                  assignedDate: '',
                })
              }
            >
              + Add Function
            </button>
          </div>
          {fns.fields.length === 0 && (
            <p className="text-xs text-body">No functions assigned.</p>
          )}
          {fns.fields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 mb-2 items-start">
              <select
                className={`${inputClass} flex-1`}
                {...register(`memberFunctions.${idx}.functionId`, { required: true })}
              >
                <option value="">-- Select Function --</option>
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
                className="px-3 py-2 text-sm text-red-600 hover:underline"
                onClick={() => fns.remove(idx)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Employment */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Employment</h2>
        <div className={gridClass}>
          <Field label="Occupation">
            <input className={inputClass} {...register('occupation')} />
          </Field>
          <Field label="Job Title">
            <input className={inputClass} {...register('jobTitle')} />
          </Field>
          <Field label="Company Name">
            <input className={inputClass} {...register('companyName')} />
          </Field>
          <Field label="Company City">
            <input className={inputClass} {...register('companyCity')} />
          </Field>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" {...register('isPublicCompany')} />
            <span className="text-sm text-black">Is Public Company</span>
          </label>
        </div>
      </section>

      {/* Education */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Education</h2>
        <div className={gridClass}>
          <Field label="Education Level" required>
            <select className={inputClass} {...register('educationLevel', { required: true })}>
              {EDUCATION_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
          className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : mode === 'create' ? 'Create Member' : 'Save Changes'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-stroke px-5 py-2 text-sm text-black hover:bg-gray-50"
          >
            Cancel
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
        {required && <span className="text-red-600 ml-0.5">*</span>}
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
