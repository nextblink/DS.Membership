import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../framework/api'

const labelClass = 'text-xs uppercase text-body'
const valueClass = 'text-sm text-black'
const sectionClass = 'rounded border border-stroke bg-white p-5 shadow-sm mb-6'
const sectionTitleClass = 'text-lg font-semibold text-black mb-4 border-b border-stroke pb-2'
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
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load member.')
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
    if (!window.confirm('Delete this member? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/api/members/${id}`)
      navigate('/members')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete member.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-body">Loading...</p>
      </div>
    )
  }
  if (error || !member) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || 'Not found.'}</p>
        <button
          onClick={() => navigate('/members')}
          className="mt-3 rounded border border-stroke px-4 py-2 text-sm text-black hover:bg-gray-50"
        >
          Back to Members
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
          <h1 className="text-2xl font-semibold text-black">{fullName}</h1>
          <p className="text-sm text-body">JMBG {member.jmbg}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/members')}
            className="rounded border border-stroke px-4 py-2 text-sm text-black hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => navigate(`/members/${id}/edit`)}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Personal</h2>
        <div className={gridClass}>
          <Field label="First Name">{member.firstName}</Field>
          <Field label="Last Name">{member.lastName}</Field>
          <Field label="Parent Name">{member.parentName}</Field>
          <Field label="Date of Birth">{member.dateOfBirth}</Field>
          <Field label="JMBG">{member.jmbg}</Field>
          <Field label="Gender">{member.gender}</Field>
          <Field label="Marital Status">{member.maritalStatus}</Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Contact</h2>
        <div className={gridClass}>
          <Field label="Postal Code">{member.postalCode}</Field>
          <Field label="City">{member.city}</Field>
          <Field label="Email">{member.email}</Field>
        </div>
        <div className="mt-4">
          <div className={labelClass}>Phones</div>
          {phones.length === 0 ? (
            <p className="text-sm text-body">—</p>
          ) : (
            <ul className="mt-1 text-sm text-black list-disc pl-5">
              {phones.map((p) => (
                <li key={p.id}>
                  {p.number} <span className="text-body">({p.type})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Membership</h2>
        <div className={gridClass}>
          <Field label="Org Unit">{orgUnitName}</Field>
          <Field label="Membership Date">{member.membershipDate}</Field>
          <Field label="Voting Place Number">{member.votingPlaceNumber}</Field>
        </div>
        <div className="mt-4">
          <div className={labelClass}>Functions</div>
          {fns.length === 0 ? (
            <p className="text-sm text-body">—</p>
          ) : (
            <ul className="mt-1 text-sm text-black list-disc pl-5">
              {fns.map((f) => (
                <li key={f.id}>
                  {f.function?.name ?? f.functionName ?? f.name}
                  {f.assignedDate ? ` — assigned ${f.assignedDate}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Employment</h2>
        <div className={gridClass}>
          <Field label="Occupation">{member.occupation}</Field>
          <Field label="Job Title">{member.jobTitle}</Field>
          <Field label="Company Name">{member.companyName}</Field>
          <Field label="Company City">{member.companyCity}</Field>
          <Field label="Is Public Company">{member.isPublicCompany ? 'Yes' : 'No'}</Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Education</h2>
        <div className={gridClass}>
          <Field label="Education Level">{member.educationLevel}</Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Linked Forms</h2>
        {!formsLoaded ? (
          <p className="text-sm text-body">Loading...</p>
        ) : forms.length === 0 ? (
          <p className="text-sm text-body">No linked forms.</p>
        ) : (
          <ul className="text-sm text-black list-disc pl-5">
            {forms.map((f) => (
              <li key={f.id}>
                <Link to={`/forms/${f.id}`} className="text-primary hover:underline">
                  {f.formNumber || `Form #${f.id}`}
                </Link>
                {f.status ? ` — ${f.status}` : ''}
                {f.scanDate ? ` (scanned ${f.scanDate})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
