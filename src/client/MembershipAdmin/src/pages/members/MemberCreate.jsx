import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../framework/api'
import MemberForm from './MemberForm'

export default function MemberCreate() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(payload) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post('/api/members', payload)
      const id = res?.data?.id
      if (id) navigate(`/members/${id}`)
      else navigate('/members')
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setError('A member with this JMBG already exists.')
      } else {
        setError(err?.response?.data?.message || 'Failed to create member.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-black mb-4">New Member</h1>
      <MemberForm
        mode="create"
        onSubmit={onSubmit}
        onCancel={() => navigate('/members')}
        submitError={error}
        submitting={submitting}
      />
    </div>
  )
}
