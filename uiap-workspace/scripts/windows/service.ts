import * as path from 'path';
import { fileURLToPath } from 'url';

// 1. Establish the correct root path when running as a Windows Service.
// `__dirname` will be `{app}/application/scripts/windows`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiapRoot = path.resolve(__dirname, '../../../');

// Change working directory to UIAP root so relative paths work natively
process.chdir(uiapRoot);

// 2. Set necessary environment variables for the Edge API
process.env.NODE_ENV = 'production';
process.env.UIAP_DATA_DIR = path.join(uiapRoot, 'data');
process.env.PORT = process.env.PORT || '3000';

console.log(`[UIAP-Edge Service] Starting in ${uiapRoot}`);
console.log(`[UIAP-Edge Service] Data Dir: ${process.env.UIAP_DATA_DIR}`);

// 3. Launch the Edge API entry point
import('../../apps/edge-api/dist/index.js').catch(err => {
    console.error('[UIAP-Edge Service] Failed to load Edge API:', err);
    process.exit(1);
});
