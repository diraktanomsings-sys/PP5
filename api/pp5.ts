import type { Request, Response } from 'express';
import { createStore, postgresDatabase } from '../server/store.js';
import { Service } from '../server/service.js';
import { blobStorage } from '../server/storage.js';
import { createHttp } from '../server/http.js';
import { DriveBridge } from '../server/drive-bridge.js';

let appPromise: Promise<ReturnType<typeof createHttp>> | undefined;
function getApp() {
  appPromise ||= (async () => {
    if (!process.env.DATABASE_URL || !process.env.APP_URL || !process.env.BLOB_STORE_ID)
      throw new Error('ConfigurationMissing');
    const origin = new URL(process.env.APP_URL).origin;
    if (!origin.startsWith('https://')) throw new Error('HttpsRequired');
    const store = await createStore(postgresDatabase(process.env.DATABASE_URL));
    const drive = new DriveBridge(store, blobStorage());
    return createHttp(
      new Service(store, 'blob', process.env.PP5_SETUP_TOKEN || ''),
      drive.storage(),
      origin,
      drive,
    );
  })().catch((error) => {
    appPromise = undefined;
    throw error;
  });
  return appPromise;
}
export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    await new Promise<void>((resolve) => {
      res.once('finish', resolve);
      res.once('close', resolve);
      app(req, res);
    });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res
      .status(503)
      .json({ error: 'ระบบกำลังเตรียมเปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ', ready: false });
  }
}
export const config = { api: { bodyParser: false } };
