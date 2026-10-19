import express, { type Request, type Response } from 'express';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { issueSignedToken } from '@vercel/blob';
import { zipSync } from 'fflate';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Service, MAX_FILE, verifyFileBytes } from './service.js';
import type { Role } from '../src/production/types.js';
import type { ObjectStorage } from './storage.js';
import { ApiError, requireThat } from './security.js';
import { signedPdf } from './signed-pdf.js';
import type { DriveBridge } from './drive-bridge.js';

const COOKIE = 'pp5_session';
function token(req: Request) {
  return (
    (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1) || ''
  );
}
function role(req: Request): Role {
  return (req.headers['x-pp5-role'] || req.query.role) as Role;
}
function sameOrigin(req: Request, origin: string) {
  requireThat(
    req.headers.origin === origin && req.headers['sec-fetch-site'] !== 'cross-site',
    403,
    'คำขอนี้ไม่ได้มาจากเว็บไซต์ที่อนุญาต',
  );
}
const mime = (kind: string) =>
  kind === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const disposition = (name: string, inline = false) =>
  `${inline ? 'inline' : 'attachment'}; filename="document"; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g, '%27')}`;

export function createHttp(
  service: Service,
  storage: ObjectStorage,
  origin: string,
  drive?: DriveBridge,
) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });
  app.use((req, res, next) => {
    if (req.query.action === 'upload' && storage.kind === 'local')
      express.raw({ type: 'application/octet-stream', limit: MAX_FILE })(req, res, next);
    else express.json({ limit: '400kb' })(req, res, next);
  });
  const setCookie = (res: Response, value: string, clear = false) =>
    res.setHeader(
      'Set-Cookie',
      `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 8 * 3600}${origin.startsWith('https:') ? '; Secure' : ''}`,
    );

  app.all('/api/pp5', async (req, res) => {
    const started = performance.now();
    const timedJson = (body: unknown) =>
      res.set('Server-Timing', `app;dur=${(performance.now() - started).toFixed(1)}`).json(body);
    try {
      const action = String(req.query.action || 'state');
      if (req.method === 'POST' && action === 'drive-job') {
        requireThat(drive, 404, 'ไม่พบช่องทางรับส่งไฟล์');
        const payload = JSON.stringify(await drive.payload(req.body?.key));
        res.type('application/json');
        await pipeline(
          Readable.from(
            (function* () {
              for (let i = 0; i < payload.length; i += 64 * 1024)
                yield payload.slice(i, i + 64 * 1024);
            })(),
          ),
          res,
        );
        return;
      }
      if (req.method === 'GET') {
        if (action === 'session') {
          // Read once for public startup status and the existing role-filtered snapshot.
          // Never cache identities or authorization between requests.
          const s = await service.store.read();
          let snapshot;
          if (token(req)) {
            try {
              snapshot = await service.snapshot(token(req), role(req), s);
            } catch (error) {
              if (!(error instanceof ApiError && error.status === 401)) throw error;
            }
          }
          timedJson({
            ready: true,
            initialized: s.users.length > 0,
            schoolLogo: s.settings?.schoolLogo || '',
            ...(snapshot ? { snapshot } : {}),
          });
          return;
        }
        if (action === 'health') {
          const s = await service.store.read();
          timedJson({
            ready: true,
            initialized: s.users.length > 0,
            schoolLogo: s.settings?.schoolLogo || '',
          });
          return;
        }
        if (action === 'state') {
          timedJson(await service.snapshot(token(req), role(req)));
          return;
        }
        if (action === 'signed') {
          const state = await service.snapshot(token(req), role(req));
          const sub = state.submissions.find((s) => s.id === req.query.id);
          requireThat(
            sub?.status === 'FINAL_LOCKED' && sub.approval,
            404,
            'ไม่พบเอกสารที่อนุมัติหรือไม่มีสิทธิ์',
          );
          const c = state.courses.find((c) => c.id === sub.courseId)!;
          const f = await service.accessibleFile(
            token(req),
            role(req),
            sub.versions.at(-1)!.pdf.id,
          );
          const bytes = await signedPdf(
            await storage.bytes(f),
            sub,
            c,
            state.people.find((p) => p.id === sub.approval!.by)?.name || sub.approval.by,
            state.settings,
          );
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': disposition('อนุมัติ_' + f.name),
          });
          await pipeline(Readable.from([Buffer.from(bytes)]), res);
          return;
        }
        if (action === 'file') {
          const file = await service.accessibleFile(token(req), role(req), String(req.query.id));
          const stream = await storage.read(file);
          res.set({
            'Content-Type': mime(file.kind),
            'Content-Length': String(file.size),
            'Content-Disposition': disposition(file.name, req.query.inline === '1'),
            'Content-Security-Policy': "default-src 'none'; sandbox",
          });
          await pipeline(stream, res);
          return;
        }
        if (action === 'archive') {
          const state = await service.snapshot(token(req), role(req));
          const subs = state.submissions.filter(
            (s) =>
              s.status === 'FINAL_LOCKED' &&
              (!req.query.termId ||
                state.courses.find((c) => c.id === s.courseId)?.termId === req.query.termId) &&
              (!req.query.year ||
                String(
                  state.terms.find(
                    (t) => t.id === state.courses.find((c) => c.id === s.courseId)?.termId,
                  )?.year,
                ) === req.query.year) &&
              (!req.query.grade ||
                state.courses
                  .find((c) => c.id === s.courseId)
                  ?.grade.startsWith(String(req.query.grade))),
          );
          requireThat(subs.length, 404, 'ไม่มีเอกสารที่อนุมัติแล้ว');
          const files = subs.flatMap((s) => [s.versions.at(-1)!.excel, s.versions.at(-1)!.pdf]);
          requireThat(
            files.reduce((n, f) => n + f.size, 0) <= 50 * 1024 * 1024,
            413,
            'ไฟล์รวมเกิน 50 MB กรุณาดาวน์โหลดแยกรายวิชา',
          );
          const entries: Record<string, Uint8Array> = {};
          for (const sub of subs) {
            const c = state.courses.find((c) => c.id === sub.courseId)!;
            const prefix = `${c.code}_${c.grade.replace(/[\\/]/g, '-')}_${sub.id.slice(0, 8)}`;
            for (const f of [sub.versions.at(-1)!.excel, sub.versions.at(-1)!.pdf])
              entries[`${prefix}/${f.name}`] = await storage.bytes(
                await service.accessibleFile(token(req), role(req), f.id),
              );
            entries[`${prefix}/approval.json`] = Buffer.from(JSON.stringify(sub.approval, null, 2));
            if (sub.approvalHistory?.length)
              entries[`${prefix}/approval-history.json`] = Buffer.from(
                JSON.stringify(sub.approvalHistory, null, 2),
              );
          }
          res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': disposition('PP5-archive.zip'),
          });
          await pipeline(Readable.from([Buffer.from(zipSync(entries, { level: 0 }))]), res);
          return;
        }
        throw new ApiError(404, 'ไม่พบข้อมูล');
      }
      requireThat(req.method === 'POST', 405, 'ไม่รองรับคำขอนี้');
      if (action === 'blob') {
        requireThat(storage.kind === 'blob', 404, 'ไม่รองรับช่องทางอัปโหลดนี้');
        sameOrigin(req, origin);
        const result = await handleUploadPresigned({
          body: req.body as HandleUploadPresignedBody,
          request: req,
          getSignedToken: async (pathname, payload) => {
            const { id } = JSON.parse(payload || '{}');
            const file = await service.pendingFile(token(req), id);
            requireThat(pathname === file.pathname, 403, 'ตำแหน่งไฟล์ไม่ถูกต้อง');
            const signedToken = await issueSignedToken({
              pathname: file.pathname,
              operations: ['put'],
              allowedContentTypes: [mime(file.kind)],
              maximumSizeInBytes: file.size,
              validUntil: Date.now() + 10 * 60_000,
            });
            return {
              token: signedToken,
              urlOptions: { access: 'private', allowOverwrite: false, addRandomSuffix: false },
            };
          },
          // Final verification is performed by the authenticated finalize request.
          // No webhook is needed: only the signed-in owner can finalize the upload.
        });
        res.json(result);
        return;
      }
      sameOrigin(req, origin);
      if (action === 'drive-config') {
        requireThat(drive, 404, 'ไม่รองรับการเชื่อม Drive ในโหมดนี้');
        await drive.configure(service, token(req), role(req), req.body);
        res.json({ ok: true });
        return;
      }
      if (action === 'drive-migrate') {
        requireThat(drive, 404, 'ไม่รองรับการเชื่อม Drive ในโหมดนี้');
        await drive.migrate(service, token(req), role(req), req.body.id);
        res.json({ ok: true });
        return;
      }
      if (action === 'setup') {
        setCookie(res, await service.setup(req.body));
        res.json({ ok: true });
        return;
      }
      if (action === 'login') {
        setCookie(res, await service.login(req.body, req.ip || 'unknown'));
        res.json({ ok: true });
        return;
      }
      if (action === 'logout') {
        await service.logout(token(req));
        setCookie(res, '', true);
        res.json({ ok: true });
        return;
      }
      if (action === 'password') {
        await service.changePassword(token(req), req.body);
        setCookie(res, '', true);
        res.json({ ok: true });
        return;
      }
      if (action === 'reserve') {
        res.json(await service.reserve(token(req), role(req), req.body));
        return;
      }
      if (action === 'upload') {
        requireThat(
          storage.kind === 'local' && storage.write && Buffer.isBuffer(req.body),
          400,
          'ช่องทางอัปโหลดไม่ถูกต้อง',
        );
        const file = await service.pendingFile(token(req), String(req.query.id));
        verifyFileBytes(file, req.body);
        await storage.write(file, req.body);
        res.json(await service.readyFile(token(req), file.id, req.body, storage.persist));
        return;
      }
      if (action === 'finalize') {
        const file = await service.pendingFile(token(req), req.body.id);
        const result = await service.readyFile(
          token(req),
          file.id,
          await storage.bytes(file),
          storage.persist,
        );
        const saved = (await service.store.read()).files[file.id];
        if (saved.drive && storage.release) {
          try {
            await storage.release(saved);
          } catch {
            console.warn('PP5 temporary upload cleanup pending');
          }
        }
        res.json(result);
        return;
      }
      if (action === 'submit') await service.submit(token(req), role(req), req.body);
      else if (action === 'review') await service.review(token(req), role(req), req.body);
      else if (action === 'finding') await service.finding(token(req), role(req), req.body);
      else if (action === 'approve') await service.approve(token(req), role(req), req.body);
      else if (action === 'approve-batch')
        await service.approveBatch(token(req), role(req), req.body);
      else if (action === 'user') await service.createUser(token(req), role(req), req.body);
      else await service.configure(token(req), role(req), action, req.body);
      res.json({ ok: true });
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (error instanceof ApiError) res.status(error.status).json({ error: error.message });
      else {
        console.error('PP5 request failed:', error instanceof Error ? error.name : 'UnknownError');
        res.status(500).json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ' });
      }
    }
  });
  app.use((error: any, _req: Request, res: Response, _next: any) =>
    res.status(error.status === 413 ? 413 : 400).json({
      error: error.status === 413 ? 'ไฟล์หรือคำขอมีขนาดเกินกำหนด' : 'รูปแบบคำขอไม่ถูกต้อง',
    }),
  );
  return app;
}
