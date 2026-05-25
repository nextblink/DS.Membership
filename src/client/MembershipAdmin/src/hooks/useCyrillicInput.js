import { useCallback, useLayoutEffect, useRef } from 'react'
import { toCyrillicSr } from '../services/transliteration'

// For simple useState-controlled text inputs.
// Returns an onChange handler that converts Latin → Cyrillic on every keystroke
// and restores cursor position correctly (including mid-word edits).
//
// Usage:
//   const [name, setName] = useState('')
//   const cyrOnChange = useCyrillicInput(setName)
//   <input value={name} onChange={cyrOnChange} />
export function useCyrillicInput(setter) {
  const cursorRef = useRef(null)

  const onChange = useCallback(
    (e) => {
      const raw = e.target.value
      const sel = e.target.selectionStart
      const cyr = toCyrillicSr(raw)
      cursorRef.current = { el: e.target, pos: toCyrillicSr(raw.slice(0, sel)).length }
      setter(cyr)
    },
    [setter],
  )

  useLayoutEffect(() => {
    if (cursorRef.current) {
      const { el, pos } = cursorRef.current
      cursorRef.current = null
      try { el.setSelectionRange(pos, pos) } catch {}
    }
  })

  return onChange
}

// For react-hook-form fields. Call once at the top of any RHF component
// that has transliterated fields.
//
// Usage in a component:
//   const { pendingCursor, cyrRhfOnChange } = useRhfCyrillicInput(setValue)
//
//   register('firstName', {
//     onChange: (e) => cyrRhfOnChange(e, 'firstName'),
//   })
//
// cyrRhfOnChange converts the typed value to Cyrillic, writes it back via
// setValue, and queues a cursor restoration that fires in useLayoutEffect.
export function useRhfCyrillicInput(setValue) {
  const pendingCursor = useRef(null)

  useLayoutEffect(() => {
    if (pendingCursor.current) {
      const { el, pos } = pendingCursor.current
      pendingCursor.current = null
      try { el.setSelectionRange(pos, pos) } catch {}
    }
  })

  const cyrRhfOnChange = useCallback(
    (e, fieldName) => {
      const raw = e.target.value
      const sel = e.target.selectionStart
      const cyr = toCyrillicSr(raw)
      pendingCursor.current = { el: e.target, pos: toCyrillicSr(raw.slice(0, sel)).length }
      setValue(fieldName, cyr, { shouldValidate: false, shouldDirty: true })
    },
    [setValue],
  )

  return { cyrRhfOnChange }
}
