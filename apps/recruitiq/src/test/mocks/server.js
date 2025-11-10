import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW Server for Node.js (Tests)
 * 
 * This sets up a mock server that intercepts HTTP requests during tests.
 * The server uses the handlers defined in handlers.js.
 * 
 * Usage in tests:
 * - beforeAll(() => server.listen())
 * - afterEach(() => server.resetHandlers())
 * - afterAll(() => server.close())
 */
export const server = setupServer(...handlers)
