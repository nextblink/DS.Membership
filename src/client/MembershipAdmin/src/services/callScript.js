// Enum values mirror the backend Enums.cs ordinals.
export const CALL_OUTCOME = { ValidContact: 0, WrongNumber: 1, NotInService: 2, NoAnswer: 3, Refused: 4 }
export const PARTY_RELATION = { StayMember: 0, Sympathizer: 1, NoCooperation: 2 }
export const ACTIVITY_LEVEL = { Active: 0, Occasional: 1, Inactive: 2 }
export const ENGAGEMENT_AREA = {
  MunicipalBoard: 0, DepartmentalBoards: 1, CentralOffice: 2,
  OrganizationalExecutive: 3, ElectionCampaign: 4, ElectionMonitor: 5,
}

// The ordered step keys of the wizard.
export const STEPS = [
  'outcome', 'relation', 'activity', 'engagement', 'contactData', 'suggestion', 'recommendations',
]

// Given the answers gathered so far, return the next step key, or 'end' if the
// conversation terminates. `answers` is a partial object of collected values.
export function nextStep(current, answers) {
  switch (current) {
    case 'outcome':
      // Only a valid contact continues; every other outcome ends the call.
      return answers.outcome === CALL_OUTCOME.ValidContact ? 'relation' : 'end'
    case 'relation':
      // No cooperation ends immediately.
      if (answers.relation === PARTY_RELATION.NoCooperation) return 'end'
      // Sympathizers skip activity/engagement, go straight to updating data.
      if (answers.relation === PARTY_RELATION.Sympathizer) return 'contactData'
      return 'activity'
    case 'activity':
      // Engagement questions only when they want to be (more) active.
      // Active/Occasional → ask engagement; Inactive → only if WantsToBeActive.
      if (answers.activity === ACTIVITY_LEVEL.Inactive && answers.wantsToBeActive !== true) {
        return 'contactData'
      }
      return 'engagement'
    case 'engagement':
      return 'contactData'
    case 'contactData':
      return 'suggestion'
    case 'suggestion':
      return 'recommendations'
    case 'recommendations':
      return 'end'
    default:
      return 'end'
  }
}

export function isTerminal(step) {
  return step === 'end'
}

// Converts a PascalCase enum member name (as serialized by the backend's
// JsonStringEnumConverter, e.g. "ValidContact") into the camelCase key used in
// locales/*/enums.json (e.g. "validContact").
export function toEnumKey(value) {
  if (value === null || value === undefined || value === '') return null
  return String(value).charAt(0).toLowerCase() + String(value).slice(1)
}
