// Route table for the membership admin client.
// Public: /login. Everything else wrapped in <PrivateRoute>, with role-restricted
// routes passing `roles={[...]}` per the spec (Authorization Rules Summary).
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import PrivateRoute from '../framework/private-route'
import {
  DASHBOARD_ROLES,
  MEMBERS_ROLES,
  FORMS_ROLES,
  ORG_UNITS_ROLES,
  FUNCTIONS_ROLES,
  USERS_ROLES,
  CALLCENTER_ADMIN_ROLES,
  CALLCENTER_OPERATOR_ROLES,
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
import Committees from '../pages/committees/Committees'
import CommitteeBodies from '../pages/bodies/CommitteeBodies'
import Functions from '../pages/functions/Functions'
import Users from '../pages/users/Users'
import Profile from '../pages/profile/Profile'
import CampaignList from '../pages/callcenter/CampaignList'
import CampaignForm from '../pages/callcenter/CampaignForm'
import ContactImport from '../pages/callcenter/ContactImport'
import ContactList from '../pages/callcenter/ContactList'
import PoolList from '../pages/callcenter/PoolList'
import PoolForm from '../pages/callcenter/PoolForm'
import CallQueue from '../pages/callcenter/CallQueue'
import CallScript from '../pages/callcenter/CallScript'
import CallCenterReports from '../pages/callcenter/CallCenterReports'

const guarded = (element, roles) => <PrivateRoute roles={roles}>{element}</PrivateRoute>

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <PrivateRoute>
            <AppLayout />
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

        <Route path="/committees" element={guarded(<Committees />, ORG_UNITS_ROLES)} />
        <Route path="/bodies" element={guarded(<CommitteeBodies />, ORG_UNITS_ROLES)} />
        <Route path="/functions" element={guarded(<Functions />, FUNCTIONS_ROLES)} />
        <Route path="/users" element={guarded(<Users />, USERS_ROLES)} />

        <Route path="/callcenter/campaigns" element={guarded(<CampaignList />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/campaigns/new" element={guarded(<CampaignForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/campaigns/:id/edit" element={guarded(<CampaignForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/import" element={guarded(<ContactImport />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/contacts" element={guarded(<ContactList />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/pools" element={guarded(<PoolList />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/pools/new" element={guarded(<PoolForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/pools/:id/edit" element={guarded(<PoolForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/queue" element={guarded(<CallQueue />, CALLCENTER_OPERATOR_ROLES)} />
        <Route path="/callcenter/call/:id" element={guarded(<CallScript />, CALLCENTER_OPERATOR_ROLES)} />
        <Route path="/callcenter/reports" element={guarded(<CallCenterReports />, CALLCENTER_ADMIN_ROLES)} />

        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Route>

      {/* Public mobile upload — no auth required */}
      <Route path="/m/upload" element={<MobileUpload />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
