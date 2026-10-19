import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { thaiFont, defaultLogo } from './pdf-assets.js';
import type { Submission, Course, SchoolSettings } from '../src/production/types.js';
import { requireThat } from './security.js';
export async function signedPdf(
  bytes: Uint8Array,
  sub: Submission,
  course: Course,
  signer: string,
  settings: SchoolSettings = {},
) {
  requireThat(sub.approval && sub.status === 'FINAL_LOCKED', 409, 'เอกสารยังไม่ได้รับการอนุมัติ');
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    requireThat(
      false,
      422,
      'PDF มีการเข้ารหัสหรือโครงสร้างไม่รองรับ กรุณาดาวน์โหลดต้นฉบับและหลักฐานการอนุมัติ',
    );
  }
  doc!.registerFontkit(fontkit);
  const font = await doc!.embedFont(Buffer.from(thaiFont, 'base64'), { subset: true });
  const page = doc!.addPage([595.28, 841.89]);
  const color = rgb(0, 0.14, 0.43);
  let y = 760;
  const line = (value: string, size = 12) => {
    let text = '';
    for (const char of value) {
      if (char === '\n' || font.widthOfTextAtSize(text + char, size) > 485) {
        page.drawText(text, { x: 55, y, size, font, color });
        y -= size + 8;
        text = char === '\n' ? '' : char;
      } else text += char;
    }
    if (text) {
      page.drawText(text, { x: 55, y, size, font, color });
      y -= size + 10;
    }
  };
  line('หลักฐานแนบท้ายการอนุมัติเอกสาร ปพ.5', 19);
  line('โรงเรียนบ้านคูเมือง · สพป.สิงห์บุรี', 13);
  y -= 12;
  line(`${course.code} ${course.name} · ${course.grade}`, 14);
  line(`เอกสารเวอร์ชัน V${String(sub.versions.at(-1)!.number).padStart(3, '0')}`);
  line('ผู้อนุมัติ: ' + signer);
  line(
    'เวลาบันทึก: ' +
      new Date(sub.approval.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
  );
  line('รหัสรายการ: ' + sub.id, 10);
  y -= 8;
  line('SHA-256 ของ PDF ต้นฉบับ', 10);
  line(sub.approval.pdfHash, 9);
  line('SHA-256 ของ Excel ต้นฉบับ', 10);
  line(sub.approval.excelHash, 9);
  line('SHA-256 ของหลักฐานอนุมัติ', 10);
  line(sub.approval.manifestHash, 9);
  const signature = await doc!.embedPng(sub.approval.signature);
  const dims = signature.scaleToFit(230, 90);
  page.drawImage(signature, { x: 65, y: 165, width: dims.width, height: dims.height });
  const logoUrl =
    settings.schoolLogo && !settings.schoolLogo.startsWith('data:image/webp')
      ? settings.schoolLogo
      : defaultLogo;
  const logo = logoUrl.startsWith('data:image/jpeg')
    ? await doc!.embedJpg(logoUrl)
    : await doc!.embedPng(logoUrl);
  const logoSize = logo.scaleToFit(85, 85);
  page.drawImage(logo, { x: 410, y: 168, width: logoSize.width, height: logoSize.height });
  page.drawText(signer, { x: 65, y: 145, size: 11, font, color });
  page.drawText('สำเนาประกอบหลักฐานในระบบ หน้าเอกสารต้นฉบับคงเนื้อหาเดิม', {
    x: 55,
    y: 90,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText('ลายมือชื่อและตราแสดงบนหน้าแนบท้ายนี้ ไม่ใช่ใบรับรองดิจิทัลจากหน่วยงานภายนอก', {
    x: 55,
    y: 72,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  return doc!.save();
}
