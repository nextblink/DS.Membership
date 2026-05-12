// Application configuration — roles, navigation, entity metadata (sketch).
//
// Per spec (Authorization Rules Summary):
//   /dashboard               → SuperAdmin, Admin, LocalAdmin
//   /members, /members/*     → SuperAdmin, Admin, LocalAdmin, Operator, Viewer
//   /forms, /forms/*         → SuperAdmin, Admin, LocalAdmin, Operator
//   /org-units               → SuperAdmin only
//   /functions               → SuperAdmin only
//   /users                   → SuperAdmin only
//   /profile                 → all roles

export const ROLES = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  LocalAdmin: 'LocalAdmin',
  Operator: 'Operator',
  Viewer: 'Viewer',
}

export const ALL_ROLES = Object.values(ROLES)

// Role lists for route + nav gating.
export const DASHBOARD_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin]
export const MEMBERS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Operator, ROLES.Viewer]
export const FORMS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Operator]
export const ORG_UNITS_ROLES = [ROLES.SuperAdmin]
export const FUNCTIONS_ROLES = [ROLES.SuperAdmin]
export const USERS_ROLES = [ROLES.SuperAdmin]

// Sidebar nav — each item declares which roles can see it.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: DASHBOARD_ROLES },
  { to: '/members', label: 'Members', roles: MEMBERS_ROLES },
  { to: '/forms', label: 'Forms', roles: FORMS_ROLES },
  { to: '/org-units', label: 'Org Units', roles: ORG_UNITS_ROLES },
  { to: '/functions', label: 'Functions', roles: FUNCTIONS_ROLES },
  { to: '/users', label: 'Users', roles: USERS_ROLES },
  { to: '/profile', label: 'Profile', roles: ALL_ROLES },
]

// Entity metadata sketch — filled in during Wave 7 (issues #16-#22).
export const entities = {
  // members: { listEndpoint: '/api/members', columns: [...], fields: [...] },
  // forms:   { listEndpoint: '/api/forms',   columns: [...], fields: [...] },
}

const config = { ROLES, NAV_ITEMS, entities }
export default config
