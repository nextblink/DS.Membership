import { describe, it, expect } from 'vitest'
import { ROLES, MEMBERS_ROLES, FORMS_ROLES, DASHBOARD_ROLES, CALLCENTER_OPERATOR_ROLES } from './config'

// These assertions encode a deliberate access-control decision (the Operator
// lockdown), not an incidental fact about the current contents of config.js.
// config.js is the single lever controlling both the sidebar and the routes
// for Operators — a one-word edit here would silently re-open Members/Forms
// to Operators (or lock them out of the call queue) with nothing else failing.
describe('config role arrays — Operator lockdown', () => {
  it('does not grant Operator access to Members', () => {
    expect(MEMBERS_ROLES).not.toContain(ROLES.Operator)
  })

  it('does not grant Operator access to Forms', () => {
    expect(FORMS_ROLES).not.toContain(ROLES.Operator)
  })

  it('grants Operator access to the Dashboard', () => {
    expect(DASHBOARD_ROLES).toContain(ROLES.Operator)
  })

  it('keeps the call queue reachable for Operator', () => {
    expect(CALLCENTER_OPERATOR_ROLES).toContain(ROLES.Operator)
  })
})
