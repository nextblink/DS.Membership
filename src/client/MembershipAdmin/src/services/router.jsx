// Route table for the membership admin client.
// Public: /login. Everything else wrapped in <PrivateRoute>, with role-restricted
// routes passing `roles={[...]}` per the spec (Authorization Rules Summary).
import { Routes, Route, Navigate } from 'react-router-dom'
import DefaultLayout from '../components/DefaultLayout'
import PrivateRoute from '../framework/private-route'
import {
  DASHBOARD_ROLES,
  MEMBERS_ROLES,
  FORMS_ROLES,
  ORG_UNITS_ROLES,
  FUNCTIONS_ROLES,
  USERS_ROLES,
} from '../config'

import Login from '../pages/login/Login'
import MobileUpload from '../pages/upload/MobileUpload'
import Dashboard from '../pages/dashboard/Dashboard'
import MembersList from '../pages/members/MembersList'
import MemberCreate from '../pages/members/MemberCreate'
import MemberDetails from '../pages/members/MemberDetails'
import MemberEdit from '../pages/members/MemberEdit'
import FormsList from '../pages/forms/FormsList'
import FormUpload from '../pages/forms/FormUpload'
import FormDetails from '../pages/forms/FormDetails'
import OrgUnits from '../pages/org-units/OrgUnits'
import Functions from '../pages/functions/Functions'
import Users from '../pages/users/Users'
import Profile from '../pages/profile/Profile'

const guarded = (element, roles) => <PrivateRoute roles={roles}>{element}</PrivateRoute>

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <PrivateRoute>
            <DefaultLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={guarded(<Dashboard />, DASHBOARD_ROLES)} />

        <Route path="/members" element={guarded(<MembersList />, MEMBERS_ROLES)} />
        <Route path="/members/new" element={guarded(<MemberCreate />, MEMBERS_ROLES)} />
        <Route path="/members/:id" element={guarded(<MemberDetails />, MEMBERS_ROLES)} />
        <Route path="/members/:id/edit" element={guarded(<MemberEdit />, MEMBERS_ROLES)} />

        <Route path="/forms" element={guarded(<FormsList />, FORMS_ROLES)} />
        <Route path="/forms/new" element={guarded(<FormUpload />, FORMS_ROLES)} />
        <Route path="/forms/:id" element={guarded(<FormDetails />, FORMS_ROLES)} />

        <Route path="/org-units" element={guarded(<OrgUnits />, ORG_UNITS_ROLES)} />
        <Route path="/functions" element={guarded(<Functions />, FUNCTIONS_ROLES)} />
        <Route path="/users" element={guarded(<Users />, USERS_ROLES)} />

        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Route>

      {/* Public mobile upload — no auth required */}
      <Route path="/m/upload" element={<MobileUpload />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
