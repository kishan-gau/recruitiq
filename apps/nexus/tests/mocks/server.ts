import { setupServer } from 'msw/node';
import { schedulehubHandlers } from './schedulehub.handlers';
import { nexusHandlers } from './nexus.handlers';

// Setup MSW server with all handlers
export const server = setupServer(...schedulehubHandlers, ...nexusHandlers);
