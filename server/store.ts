import { Pool } from 'pg';
import type {
  Person,
  Term,
  Course,
  Submission,
  Audit,
  FileRecord,
  SchoolSettings,
} from '../src/production/types.js';

export interface StoredUser extends Person {
  passwordHash: string;
}
export interface StoredFile extends FileRecord {
  ownerId: string;
  courseId: string;
  pathname: string;
  ready: boolean;
  used: boolean;
  expiresAt: number;
  purpose?: 'annotation';
  metrics?: import('../src/production/types.js').Version['metrics'];
  drive?: {
    id: string;
    folderId: string;
    webViewLink: string;
    copiedAt: string;
    parentId?: string;
    layout?: string[];
  };
  sourceReleased?: boolean;
}
export interface Session {
  userId: string;
  expiresAt: number;
}
export interface State {
  purges?: Record<string, import('./purge.js').PurgeTask>;
  storageWrites?: Record<string, { token: string; expiresAt: number }>;
  users: StoredUser[];
  terms: Term[];
  courses: Course[];
  submissions: Submission[];
  audit: Audit[];
  sessions: Record<string, Session>;
  files: Record<string, StoredFile>;
  attempts: Record<string, { count: number; until: number }>;
  settings?: SchoolSettings;
  driveConfig?: import('./drive-bridge.js').DriveConfig;
  driveJobs?: Record<string, import('./drive-bridge.js').DriveJob>;
}
export const emptyState = (): State => ({
  users: [],
  terms: [],
  courses: [],
  submissions: [],
  audit: [],
  sessions: {},
  files: {},
  attempts: {},
});
export interface QueryClient {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
}
export interface Database extends QueryClient {
  transaction: <T>(fn: (client: QueryClient) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}
export interface Store {
  read: () => Promise<State>;
  write: <T>(fn: (state: State) => T) => Promise<T>;
}

// One locked aggregate keeps a small school's version, status and audit changes atomic.
// Files live in private object storage, never inside this JSON document.
export async function createStore(db: Database): Promise<Store> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS pp5_state (id integer PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL)`,
  );
  await db.query(
    'INSERT INTO pp5_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
    [JSON.stringify(emptyState())],
  );
  return {
    read: async () =>
      structuredClone((await db.query('SELECT data FROM pp5_state WHERE id = 1')).rows[0].data),
    write: async (fn) =>
      db.transaction(async (tx) => {
        const row = (await tx.query('SELECT data FROM pp5_state WHERE id = 1 FOR UPDATE')).rows[0];
        const state: State = structuredClone(row.data);
        const result = fn(state);
        await tx.query('UPDATE pp5_state SET data = $1::jsonb WHERE id = 1', [
          JSON.stringify(state),
        ]);
        return result;
      }),
  };
}

export function postgresDatabase(url: string): Database {
  const connection = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(connection.protocol))
    throw new Error('InvalidDatabaseUrl');
  // Hosted connections must validate the database's TLS certificate.
  connection.searchParams.set('sslmode', 'verify-full');
  const pool = new Pool({
    connectionString: connection.toString(),
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
  });
  return {
    query: (sql, params) => pool.query(sql, params),
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const value = await fn(client);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
