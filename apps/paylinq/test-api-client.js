// Quick test to verify API client has the fix
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const clientPath = join(__dirname, '../../packages/api-client/src/core/client.ts');
const content = readFileSync(clientPath, 'utf-8');

const hasMe = content.includes("'/auth/tenant/me'");
const skipListMatch = content.match(/skipRefreshUrls = \[([\s\S]*?)\]/);

console.log('Has /auth/tenant/me in skip list:', hasMe);
if (skipListMatch) {
  console.log('\nSkip list contents:');
  console.log(skipListMatch[1]);
}

process.exit(hasMe ? 0 : 1);
