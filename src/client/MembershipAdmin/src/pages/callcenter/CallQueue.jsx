// Operator landing page: pull the next unattempted contact from the pool and
// jump into the guided call script. Mirrors button/card conventions from
// pages/callcenter/PoolForm.jsx.
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'

export default function CallQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const [empty, setEmpty] = useState(false)
  const [busy, setBusy] = useState(false)
  // Seed the error banner with a one-time warning passed from MemberCreate.jsx
  // when the call contact was created as a member but the server-side
  // conversion link (setConverted) failed to save.
  const [error, setError] = useState(
    location.state?.conversionWarning
      ? 'Члан је сачуван, али повезивање са контактом није успело — молимо ажурирајте ручно.'
      : null
  )

  const callNext = async () => {
    setBusy(true)
    setError(null)
    setEmpty(false)
    try {
      const contact = await callCenterApi.getNext()
      if (!contact) {
        setEmpty(true)
        return
      }
      navigate(`/callcenter/call/${contact.id}`)
    } catch (err) {
      setError(err?.response?.data?.message || 'Учитавање следећег контакта није успело.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-10 text-center max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400 mb-6">Позивање</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={callNext}
        disabled={busy}
        className="rounded-lg bg-brand-500 hover:bg-brand-600 px-8 py-4 text-theme-lg font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Учитавање...' : 'Позови следећи'}
      </button>

      {empty && (
        <p className="mt-6 text-theme-sm text-gray-500 dark:text-gray-400">
          Нема више контаката за позивање.
        </p>
      )}
    </div>
  )
}
