import '@testing-library/jest-dom/vitest'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { server } from './mocks/server'

expect.extend(matchers)

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key) => {
    if (key === 'recruitiq_token') return 'mock-jwt-token-12345'
    if (key === 'recruitiq_refresh_token') return 'mock-refresh-token-67890'
    return null
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ 
    onUnhandledRequest: 'warn' // Warn about unhandled requests instead of erroring
  })
})

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  cleanup()
  server.resetHandlers()
  // Reset localStorage mock calls
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})

// Clean up after the tests are finished
afterAll(() => {
  server.close()
})
