// Application configuration — roles, navigation, entity metadata (sketch).
//
// Per spec (Authorization Rules Summary):
//   /dashboard               → SuperAdmin, Admin, LocalAdmin
//   /members, /members/*     → SuperAdmin, Admin, LocalAdmin, Operator, Viewer
//   /forms, /forms/*         → SuperAdmin, Admin, LocalAdmin, Operator
//   /committees              → SuperAdmin only
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
  { to: '/dashboard', label: 'Dashboard', roles: DASHBOARD_ROLES, iconName: 'home', section: 'main' },
  { to: '/members', label: 'Members', roles: MEMBERS_ROLES, iconName: 'users', section: 'main' },
  { to: '/forms', label: 'Forms', roles: FORMS_ROLES, iconName: 'document', section: 'main' },
  { to: '/committees', label: 'Committees', roles: ORG_UNITS_ROLES, iconName: 'building', section: 'main' },
  { to: '/functions', label: 'Functions', roles: FUNCTIONS_ROLES, iconName: 'clipboard', section: 'main' },
  { to: '/users', label: 'Users', roles: USERS_ROLES, iconName: 'user-group', section: 'main' },
  { to: '/profile', label: 'Profile', roles: ALL_ROLES, iconName: 'user-circle', section: 'account' },
]

// Entity metadata sketch — filled in during Wave 7 (issues #16-#22).
export const entities = {
  // members: { listEndpoint: '/api/members', columns: [...], fields: [...] },
  // forms:   { listEndpoint: '/api/forms',   columns: [...], fields: [...] },
}

const config = { ROLES, NAV_ITEMS, entities }
export default config
