import { unzipSync, strFromU8 } from 'fflate';
export interface Sheet {
  name: string;
  rows: string[][];
}
const nodes = (doc: Document | Element, name: string) =>
  Array.from(doc.getElementsByTagNameNS('*', name));
interface XmlParser {
  parseFromString: (text: string, type: 'application/xml') => unknown;
}
const xml = (bytes: Uint8Array, parser: XmlParser) => {
  if (bytes.length > 15_000_000)
    throw new Error('ชีตมีขนาดใหญ่เกินการแสดงตัวอย่าง กรุณาดาวน์โหลดเปิดใน Excel');
  const source = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('ไม่รองรับ XML ที่มี DTD หรือ entity');
  const doc = parser.parseFromString(source, 'application/xml') as Document;
  if (doc.getElementsByTagName('parsererror').length) throw new Error('โครงสร้าง Excel ไม่ถูกต้อง');
  return doc;
};
export function readWorkbook(bytes: Uint8Array, parser: XmlParser = new DOMParser()): Sheet[] {
  let size = 0;
  const files = unzipSync(bytes, {
    filter: (e) => {
      size += e.originalSize;
      if (size > 100 * 1024 * 1024) throw new Error('ข้อมูล Excel มีขนาดขยายเกินกำหนด');
      return /^xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/sheet[^/]*\.xml)$/.test(
        e.name,
      );
    },
  });
  const strings = files['xl/sharedStrings.xml']
    ? nodes(xml(files['xl/sharedStrings.xml'], parser), 'si').map((si) =>
        nodes(si, 't')
          .map((t) => t.textContent || '')
          .join(''),
      )
    : [];
  const relationships = files['xl/_rels/workbook.xml.rels']
    ? nodes(xml(files['xl/_rels/workbook.xml.rels'], parser), 'Relationship')
    : [];
  const sheetNames = files['xl/workbook.xml']
    ? nodes(xml(files['xl/workbook.xml'], parser), 'sheet')
    : [];
  const named = new Map<string, string>();
  for (const sheet of sheetNames) {
    const rid = sheet.getAttribute('r:id');
    const rel = relationships.find(
      (r) => r.getAttribute('Id') === rid && r.getAttribute('TargetMode') !== 'External',
    );
    const target = rel?.getAttribute('Target') || '';
    const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    named.set(path, sheet.getAttribute('name') || path);
  }
  return Object.entries(files)
    .filter(([path]) => /^xl\/worksheets\/sheet[^/]*\.xml$/.test(path))
    .slice(0, 50)
    .map(([path, data]) => ({
      name: named.get(path) || path.split('/').pop()!,
      rows: nodes(xml(data, parser), 'row')
        .slice(0, 10000)
        .map((row) => {
          const cells: string[] = [];
          for (const cell of nodes(row, 'c')) {
            const letters = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0] || 'A';
            let column = 0;
            for (const char of letters) column = column * 26 + char.charCodeAt(0) - 64;
            if (column > 150) continue;
            const type = cell.getAttribute('t');
            const value = nodes(cell, 'v')[0]?.textContent || '';
            cells[column - 1] =
              type === 's'
                ? strings[Number(value)] || ''
                : type === 'inlineStr'
                  ? nodes(cell, 't')
                      .map((t) => t.textContent || '')
                      .join('')
                  : value;
          }
          return Array.from(cells, (value) => value || '');
        }),
    }));
}
export function workbookMetrics(sheets: Sheet[]) {
  const normalize = (v: string) => v.toLowerCase().replace(/[\s_()]/g, '');
  for (const sheet of sheets)
    for (let i = 0; i < Math.min(sheet.rows.length, 50); i++) {
      const h = sheet.rows[i].map(normalize);
      const grade = h.findIndex((v) =>
        ['grade', 'gpa', 'เกรด', 'ผลการเรียน', 'ระดับผลการเรียน'].includes(v),
      );
      const student = h.findIndex((v) =>
        ['เลขที่', 'รหัสนักเรียน', 'studentnumber', 'studentid', 'studentcode'].includes(v),
      );
      const attendance = h.findIndex((v) =>
        ['attendancepercentage', 'ร้อยละเวลาเรียน', 'เวลาเรียน%', 'การเข้าเรียน%'].includes(v),
      );
      if (grade < 0 || student < 0) continue;
      const studentRows = sheet.rows.slice(i + 1).filter((r) => /^\d+$/.test(r[student] || ''));
      if (studentRows.some((r) => !/^\d(?:\.\d+)?$/.test(r[grade] || '') || Number(r[grade]) > 4))
        return undefined;
      const values = sheet.rows
        .slice(i + 1)
        .filter((r) => /^\d+$/.test(r[student] || '') && /^\d(?:\.\d+)?$/.test(r[grade] || ''))
        .map((r) => ({
          grade: Number(r[grade]),
          attendance:
            attendance >= 0 && r[attendance]?.trim() ? Number(r[attendance].replace('%', '')) : NaN,
        }))
        .filter((v) => v.grade >= 0 && v.grade <= 4);
      if (!values.length) continue;
      const attended = values.filter(
        (v) => Number.isFinite(v.attendance) && v.attendance >= 0 && v.attendance <= 100,
      );
      return {
        averageGpa: values.reduce((n, v) => n + v.grade, 0) / values.length,
        passPercentage: (100 * values.filter((v) => v.grade >= 1).length) / values.length,
        averageAttendance:
          attended.length && attended.length === values.length
            ? attended.reduce((n, v) => n + v.attendance, 0) / attended.length
            : null,
        studentCount: values.length,
      };
    }
  return undefined;
}
