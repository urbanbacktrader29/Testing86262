import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const PAGE_WIDTH = 595.28; // A4 in pt
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(trial, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Rendert einen Markdown-artigen Report (##-Überschriften, -Listen, Absätze) als einfaches, sauberes PDF. */
export async function renderReportPdf(title: string, markdown: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawParagraph = (text: string, size: number, bold: boolean, gapAfter: number) => {
    const activeFont = bold ? boldFont : font;
    for (const line of wrapText(text, activeFont, size, CONTENT_WIDTH)) {
      ensureSpace(size + 4);
      page.drawText(line, { x: MARGIN, y, size, font: activeFont, color: rgb(0.12, 0.12, 0.14) });
      y -= size + 4;
    }
    y -= gapAfter;
  };

  drawParagraph(title, 20, true, 16);

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      y -= 6;
      continue;
    }
    if (line.startsWith("## ")) drawParagraph(line.slice(3), 14, true, 8);
    else if (line.startsWith("# ")) drawParagraph(line.slice(2), 16, true, 10);
    else if (line.startsWith("- ") || line.startsWith("* ")) drawParagraph(`•  ${line.slice(2)}`, 11, false, 4);
    else drawParagraph(line, 11, false, 6);
  }

  return doc.save();
}
