import { config } from 'dotenv';
import path from 'node:path';
import { createStore } from './store.js';
import { localDatabase, localStorage } from './local.js';
import { Service } from './service.js';
import { createHttp } from './http.js';
config({ path: '.env.local', quiet: true });
if (process.env.VERCEL || process.env.NODE_ENV === 'production')
  throw new Error('Local development server cannot run in production');
const root = path.resolve(process.env.PP5_DATA_DIR || '.pp5-local');
const db = await localDatabase(path.join(root, 'postgres'));
const store = await createStore(db);
const storage = await localStorage(path.join(root, 'files'));
const port = Number(process.env.PP5_API_PORT || 3001);
const app = createHttp(
  new Service(store, 'local', process.env.PP5_SETUP_TOKEN || ''),
  storage,
  process.env.APP_URL || 'http://localhost:3000',
);
app.listen(port, '127.0.0.1', () =>
  console.log(`PP5 API: http://localhost:${port}/api/pp5 (local development storage)`),
);
