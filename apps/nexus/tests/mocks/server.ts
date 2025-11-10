import { setupServer } from 'msw/node';
import { schedulehubHandlers } from './schedulehub.handlers';

// Setup MSW server with all handlers
export const server = setupServer(...schedulehubHandlers);
