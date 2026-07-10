import { describe, it, expect } from 'vitest'
import { nextStep, isTerminal, CALL_OUTCOME, PARTY_RELATION, ACTIVITY_LEVEL } from './callScript'

describe('nextStep', () => {
  it('ends the call on a non-valid outcome', () => {
    expect(nextStep('outcome', { outcome: CALL_OUTCOME.WrongNumber })).toBe('end')
    expect(nextStep('outcome', { outcome: CALL_OUTCOME.NoAnswer })).toBe('end')
  })

  it('continues to relation on a valid contact', () => {
    expect(nextStep('outcome', { outcome: CALL_OUTCOME.ValidContact })).toBe('relation')
  })

  it('ends the call on no cooperation', () => {
    expect(nextStep('relation', { relation: PARTY_RELATION.NoCooperation })).toBe('end')
  })

  it('sympathizer skips straight to contact data', () => {
    expect(nextStep('relation', { relation: PARTY_RELATION.Sympathizer })).toBe('contactData')
  })

  it('staying a member continues to the activity question', () => {
    expect(nextStep('relation', { relation: PARTY_RELATION.StayMember })).toBe('activity')
  })

  it('inactive and not wanting to activate skips engagement', () => {
    expect(nextStep('activity', {
      activity: ACTIVITY_LEVEL.Inactive, wantsToBeActive: false,
    })).toBe('contactData')
    expect(nextStep('activity', {
      activity: ACTIVITY_LEVEL.Inactive, wantsToBeActive: undefined,
    })).toBe('contactData')
  })

  it('inactive but wanting to activate asks engagement', () => {
    expect(nextStep('activity', {
      activity: ACTIVITY_LEVEL.Inactive, wantsToBeActive: true,
    })).toBe('engagement')
  })

  it('active or occasional always asks engagement', () => {
    expect(nextStep('activity', { activity: ACTIVITY_LEVEL.Active })).toBe('engagement')
    expect(nextStep('activity', { activity: ACTIVITY_LEVEL.Occasional })).toBe('engagement')
  })

  it('walks the remaining fixed steps to the end', () => {
    expect(nextStep('engagement', {})).toBe('contactData')
    expect(nextStep('contactData', {})).toBe('suggestion')
    expect(nextStep('suggestion', {})).toBe('recommendations')
    expect(nextStep('recommendations', {})).toBe('end')
  })
})

describe('isTerminal', () => {
  it('is true only for "end"', () => {
    expect(isTerminal('end')).toBe(true)
    expect(isTerminal('outcome')).toBe(false)
  })
})
