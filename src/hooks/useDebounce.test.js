import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce Hook', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500))
    expect(result.current).toBe('test')
  })

  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    )

    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'updated', delay: 100 })

    // Should still be initial immediately
    expect(result.current).toBe('initial')

    // Wait for debounce
    await waitFor(() => expect(result.current).toBe('updated'), { timeout: 200 })
  })

  it('cancels previous timer on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    )

    // Rapid changes
    rerender({ value: 'change1' })
    rerender({ value: 'change2' })
    rerender({ value: 'change3' })

    // Should only get final value after delay
    await waitFor(() => expect(result.current).toBe('change3'), { timeout: 200 })
  })

  it('uses custom delay', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 50),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    // Should update faster with shorter delay
    await waitFor(() => expect(result.current).toBe('updated'), { timeout: 100 })
  })

  it('handles empty string values', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: '' } }
    )

    expect(result.current).toBe('')

    rerender({ value: 'test' })

    await waitFor(() => expect(result.current).toBe('test'), { timeout: 200 })
  })
})
