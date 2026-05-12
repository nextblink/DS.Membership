// Route guard: requires authentication, optionally restricts by role.
import { Navigate } from 'react-router-dom'
import auth from './auth'

export default function PrivateRoute({ children, roles }) {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (Array.isArray(roles) && roles.length > 0) {
    const role = auth.getRole()
    if (!role || !roles.includes(role)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
