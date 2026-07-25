// Application configuration — roles, navigation, entity metadata (sketch).
//
// Authorization rules:
//   /dashboard               → SuperAdmin, Admin, LocalAdmin, Operator
//                              (Operators get their own view — see OperatorDashboard)
//   /members, /members/*     → SuperAdmin, Admin, LocalAdmin, Viewer
//   /forms, /forms/*         → SuperAdmin, Admin, LocalAdmin
//   /committees              → SuperAdmin only
//   /functions               → SuperAdmin only
//   /users                   → SuperAdmin only
//   /callcenter/queue        → SuperAdmin, Admin, Operator
//   /profile                 → all roles
//
// Operators are limited to the dashboard, the call queue, and their profile.
// The API enforces the same limits — hiding nav alone would be cosmetic.

export const ROLES = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  LocalAdmin: 'LocalAdmin',
  Operator: 'Operator',
  Viewer: 'Viewer',
}

export const ALL_ROLES = Object.values(ROLES)

// Role lists for route + nav gating.
export const DASHBOARD_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Operator]
export const MEMBERS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Viewer]
export const FORMS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin]
export const ORG_UNITS_ROLES = [ROLES.SuperAdmin]
export const FUNCTIONS_ROLES = [ROLES.SuperAdmin]
export const USERS_ROLES = [ROLES.SuperAdmin]
export const CALLCENTER_ADMIN_ROLES = [ROLES.SuperAdmin, ROLES.Admin]
export const CALLCENTER_OPERATOR_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.Operator]

// Sidebar nav — each item declares which roles can see it.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: DASHBOARD_ROLES, iconName: 'home', section: 'main' },
  { to: '/members', label: 'Members', roles: MEMBERS_ROLES, iconName: 'users', section: 'main' },
  { to: '/forms', label: 'Forms', roles: FORMS_ROLES, iconName: 'document', section: 'main' },
  { to: '/committees', label: 'Committees', roles: ORG_UNITS_ROLES, iconName: 'building', section: 'main' },
  { to: '/bodies', label: 'Bodies', roles: ORG_UNITS_ROLES, iconName: 'flag', section: 'main' },
  { to: '/functions', label: 'Functions', roles: FUNCTIONS_ROLES, iconName: 'clipboard', section: 'main' },
  { to: '/users', label: 'Users', roles: USERS_ROLES, iconName: 'user-group', section: 'main' },
  { to: '/callcenter/campaigns', label: 'Кампање', roles: CALLCENTER_ADMIN_ROLES, iconName: 'phone', section: 'callcenter' },
  // Import Contacts nav item intentionally hidden pending dedup/validation fixes (#79)
  { to: '/callcenter/contacts', label: 'Контакти', roles: CALLCENTER_ADMIN_ROLES, iconName: 'contacts', section: 'callcenter' },
  { to: '/callcenter/pools', label: 'Групе', roles: CALLCENTER_ADMIN_ROLES, iconName: 'group', section: 'callcenter' },
  { to: '/callcenter/queue', label: 'Позивање', roles: CALLCENTER_OPERATOR_ROLES, iconName: 'phone-queue', section: 'callcenter' },
  { to: '/callcenter/reports', label: 'Извештаји', roles: CALLCENTER_ADMIN_ROLES, iconName: 'chart', section: 'callcenter' },
  { to: '/profile', label: 'Profile', roles: ALL_ROLES, iconName: 'user-circle', section: 'account' },
]

// Entity metadata sketch — filled in during Wave 7 (issues #16-#22).
export const entities = {
  // members: { listEndpoint: '/api/members', columns: [...], fields: [...] },
  // forms:   { listEndpoint: '/api/forms',   columns: [...], fields: [...] },
}

const config = { ROLES, NAV_ITEMS, entities }
export default config
