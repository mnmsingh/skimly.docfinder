import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that only updates once `delayMs`
 * milliseconds have passed without `value` changing again. Used to avoid
 * re-running search on every keystroke.
 *
 * @param value - The latest value (e.g. raw search input).
 * @param delayMs - How long to wait after the last change before updating.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debouncedValue
}
